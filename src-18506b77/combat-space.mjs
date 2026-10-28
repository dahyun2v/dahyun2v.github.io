// Geometry-independent spatial snapshot kernel.
// Sources: 20_COMBAT_CORE_STANDARD v2.0 §§1, 2.1–2.2, 4.1, 5.3;
//          00_MASTER_DESIGN_MAP §4.4; CHAT-DEVELOPMENT-HANDOFF task B.
// No axial/Euclidean geometry, distance, faction hostility, or troop mapping is
// inferred here. All geometry callbacks are synchronous, pure, caller-owned.
// This is NOT an action/contact-attempt resolver: reactions, first-contact
// facing alignment, path traversal, and round/campaign commits remain external.

const UNKNOWN = 'UNKNOWN';
const SIDES = new Set(['FRONT', 'FLANK', 'REAR']);
const UNIT_FIELDS = ['unitId', 'factionId', 'anchor', 'facing', 'physicalFootprint', 'controlFootprint'];
const CONTACT_FIELDS = ['contactId', 'attackerUnitId', 'defenderUnitId', 'contactSide', 'contactWidth', 'active'];
const PUBLIC_UNIT_FIELDS = UNIT_FIELDS.filter(key => key !== 'unitId');
const PUBLIC_CONTACT_FIELDS = ['contactSide', 'contactWidth', 'active'];
const invariant = (condition, reason) => { if (!condition) throw new Error(reason); };
const validId = value => typeof value === 'string' && value.length > 0;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const copy = value => structuredClone(value);

// Canonical JSON payloads keep serialization lossless. Non-finite/signed-zero
// numbers, getters, sparse arrays, and undefined must not silently change on save.
function assertJson(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    invariant(Number.isFinite(value) && !Object.is(value, -0), 'NON_JSON_NUMBER');
    return;
  }
  invariant(Array.isArray(value) || isRecord(value), 'NON_JSON_VALUE');
  invariant(!ancestors.has(value), 'CYCLIC_JSON_VALUE');
  ancestors.add(value);
  const keys = Reflect.ownKeys(value);
  if (Array.isArray(value)) {
    invariant(Object.getPrototypeOf(value) === Array.prototype, 'NON_JSON_ARRAY_PROTOTYPE');
    invariant(keys.length === value.length + 1 && keys.includes('length'), 'NON_JSON_ARRAY');
    for (let i = 0; i < value.length; i++) invariant(Object.hasOwn(value, String(i)), 'NON_JSON_ARRAY');
  }
  for (const key of keys) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    invariant(typeof key === 'string' && Object.hasOwn(descriptor, 'value') && descriptor.enumerable, 'NON_JSON_PROPERTY');
    assertJson(descriptor.value, ancestors);
  }
  ancestors.delete(value);
}

function exactKeys(value, expected, reason) {
  invariant(isRecord(value) && Object.keys(value).length === expected.length
    && expected.every(key => Object.hasOwn(value, key)), reason);
}

function uniqueIds(records, key, reason) {
  invariant(records.every(record => validId(record[key]))
    && new Set(records.map(record => record[key])).size === records.length, reason);
}

function freeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const child of Object.values(value)) freeze(child, seen);
  return Object.freeze(value);
}

function readRule(rules, name, ...args) {
  invariant(isRecord(rules) && Object.hasOwn(rules, name) && typeof rules[name] === 'function', `SPATIAL_INPUT_REQUIRED:${name}`);
  return rules[name](...args);
}

function readTruth(rules, name, ...args) {
  const value = readRule(rules, name, ...args);
  invariant(value === true || value === false || value === UNKNOWN, `INVALID_SPATIAL_RESULT:${name}`);
  return value;
}

function knownTruth(rules, name, ...args) {
  const value = readTruth(rules, name, ...args);
  invariant(value !== UNKNOWN, `SPATIAL_INPUT_REQUIRED:${name}`);
  return value;
}

/** Structural/save validation only; physical validity requires the adapter. */
export function validateCombatSpace(state) {
  assertJson(state);
  exactKeys(state, ['format', 'frontageUnit', 'units', 'contactLinks'], 'INVALID_SPACE_SHAPE');
  invariant(state.format === 'combat-space-v1', 'INVALID_SPACE_FORMAT');
  invariant(validId(state.frontageUnit), 'FRONTAGE_UNIT_REQUIRED');
  invariant(Array.isArray(state.units) && Array.isArray(state.contactLinks), 'INVALID_SPACE_COLLECTIONS');
  for (const unit of state.units) {
    exactKeys(unit, UNIT_FIELDS, 'INVALID_SPATIAL_UNIT');
    invariant(validId(unit.unitId) && validId(unit.factionId), 'INVALID_SPATIAL_UNIT_ID');
    for (const field of ['anchor', 'facing', 'physicalFootprint', 'controlFootprint']) {
      invariant(unit[field] !== null && unit[field] !== UNKNOWN, `SPATIAL_INPUT_REQUIRED:${field}`);
    }
  }
  uniqueIds(state.units, 'unitId', 'DUPLICATE_OR_INVALID_UNIT_ID');
  const units = new Map(state.units.map(unit => [unit.unitId, unit]));
  for (const link of state.contactLinks) {
    exactKeys(link, CONTACT_FIELDS, 'INVALID_CONTACT_SHAPE');
    invariant(validId(link.contactId) && validId(link.attackerUnitId) && validId(link.defenderUnitId), 'INVALID_CONTACT_ID');
    invariant(units.has(link.attackerUnitId) && units.has(link.defenderUnitId), 'UNKNOWN_CONTACT_ENDPOINT');
    invariant(link.attackerUnitId !== link.defenderUnitId, 'SELF_CONTACT');
    invariant(SIDES.has(link.contactSide), 'INVALID_CONTACT_SIDE');
    invariant(typeof link.active === 'boolean', 'INVALID_CONTACT_ACTIVE');
    invariant(typeof link.contactWidth === 'number' && Number.isFinite(link.contactWidth)
      && link.contactWidth >= 0 && (!link.active || link.contactWidth > 0), 'INVALID_CONTACT_WIDTH');
  }
  uniqueIds(state.contactLinks, 'contactId', 'DUPLICATE_OR_INVALID_CONTACT_ID');
  return state;
}

/**
 * Checks final placement and each active contact, not movement paths/history.
 * Required callbacks, only when used:
 *   validateUnitPose(unit) -> boolean | UNKNOWN
 *   sameAnchor(a,b), hasPhysicalOverlap(a,b), isPhysicalOverlapAllowed(a,b)
 *   areEnemies(a,b) -> boolean | UNKNOWN (do NOT assume different faction = foe)
 *   measureContact(attacker,defender,link,frontageUnit)
 *     -> {possible:boolean, contactSide, contactWidth, frontageUnit} | UNKNOWN
 * No callback/result is replaced with a default geometry or a permissive value.
 */
export function validateCombatSpaceGeometry(state, geometry) {
  validateCombatSpace(state);
  invariant(isRecord(geometry), 'SPATIAL_INPUT_REQUIRED:geometry');
  const snapshot = freeze(copy(state));
  for (const unit of snapshot.units) {
    invariant(knownTruth(geometry, 'validateUnitPose', unit), 'INVALID_SPATIAL_POSE');
  }
  for (let i = 0; i < snapshot.units.length; i++) {
    for (let j = i + 1; j < snapshot.units.length; j++) {
      const a = snapshot.units[i], b = snapshot.units[j];
      invariant(!knownTruth(geometry, 'sameAnchor', a, b), 'DUPLICATE_UNIT_ANCHOR');
      if (knownTruth(geometry, 'hasPhysicalOverlap', a, b)) {
        invariant(knownTruth(geometry, 'isPhysicalOverlapAllowed', a, b), 'IMPOSSIBLE_FOOTPRINT_OVERLAP');
      }
    }
  }
  const byId = new Map(snapshot.units.map(unit => [unit.unitId, unit]));
  for (const link of snapshot.contactLinks) {
    // Inactive records keep their identities but need not still touch physically.
    if (!link.active) continue;
    const attacker = byId.get(link.attackerUnitId), defender = byId.get(link.defenderUnitId);
    invariant(knownTruth(geometry, 'areEnemies', attacker, defender), 'NON_ENEMY_CONTACT');
    const measured = readRule(geometry, 'measureContact', attacker, defender, link, snapshot.frontageUnit);
    invariant(measured !== UNKNOWN, 'SPATIAL_INPUT_REQUIRED:measureContact');
    assertJson(measured);
    invariant(isRecord(measured) && typeof measured.possible === 'boolean', 'INVALID_CONTACT_MEASUREMENT');
    invariant(measured.possible, 'IMPOSSIBLE_CONTACT');
    exactKeys(measured, ['possible', 'contactSide', 'contactWidth', 'frontageUnit'], 'INVALID_CONTACT_MEASUREMENT');
    invariant(measured.frontageUnit === snapshot.frontageUnit, 'CONTACT_WIDTH_UNIT_MISMATCH');
    invariant(SIDES.has(measured.contactSide) && typeof measured.contactWidth === 'number'
      && Number.isFinite(measured.contactWidth) && measured.contactWidth > 0, 'INVALID_CONTACT_MEASUREMENT');
    invariant(measured.contactSide === link.contactSide && measured.contactWidth === link.contactWidth, 'CONTACT_GEOMETRY_MISMATCH');
  }
  return state;
}

export function createCombatSpace(input, geometry) {
  assertJson(input);
  exactKeys(input, ['frontageUnit', 'units', 'contactLinks'], 'INVALID_SPACE_INPUT');
  const next = {format: 'combat-space-v1', ...copy(input)};
  return validateCombatSpaceGeometry(next, geometry);
}

/**
 * Atomically replaces complete pose/link records in a detached snapshot.
 * Existing units cannot be added/removed/reassigned; existing contact identities
 * cannot be rebound. Deactivate a contact with active:false, not deletion.
 * Call only after action/facing/reaction legality has been resolved externally.
 * Every active link is rechecked after the whole update, including old links.
 */
export function applyCombatSpaceUpdate(state, update, geometry) {
  validateCombatSpace(state);
  assertJson(update);
  exactKeys(update, ['unitUpdates', 'contactUpdates'], 'INVALID_SPACE_UPDATE');
  invariant(Array.isArray(update.unitUpdates) && Array.isArray(update.contactUpdates), 'INVALID_SPACE_UPDATE');
  for (const unit of update.unitUpdates) exactKeys(unit, UNIT_FIELDS, 'INVALID_SPATIAL_UNIT');
  for (const link of update.contactUpdates) exactKeys(link, CONTACT_FIELDS, 'INVALID_CONTACT_SHAPE');
  uniqueIds(update.unitUpdates, 'unitId', 'DUPLICATE_OR_INVALID_UNIT_UPDATE');
  uniqueIds(update.contactUpdates, 'contactId', 'DUPLICATE_OR_INVALID_CONTACT_UPDATE');
  const next = copy(state);
  const unitIndices = new Map(next.units.map((unit, index) => [unit.unitId, index]));
  for (const unit of update.unitUpdates) {
    invariant(unitIndices.has(unit.unitId), 'UNKNOWN_UNIT_UPDATE');
    const index = unitIndices.get(unit.unitId);
    invariant(unit.factionId === next.units[index].factionId, 'UNIT_OWNERSHIP_CHANGE_OUT_OF_SCOPE');
    next.units[index] = copy(unit);
  }
  const contactIndices = new Map(next.contactLinks.map((link, index) => [link.contactId, index]));
  for (const link of update.contactUpdates) {
    if (contactIndices.has(link.contactId)) {
      const index = contactIndices.get(link.contactId), previous = next.contactLinks[index];
      invariant(previous.attackerUnitId === link.attackerUnitId && previous.defenderUnitId === link.defenderUnitId, 'CONTACT_IDENTITY_CHANGED');
      next.contactLinks[index] = copy(link);
    } else {
      next.contactLinks.push(copy(link));
    }
  }
  return validateCombatSpaceGeometry(next, geometry);
}

/**
 * Authoritative query, not an AI/public view. UNKNOWN is knowledge status, not
 * a fourth persistent combat state. Active Contact wins over Control checks.
 */
export function deriveCombatContactState(state, unitId, geometry) {
  validateCombatSpace(state);
  invariant(validId(unitId) && state.units.some(unit => unit.unitId === unitId), 'UNKNOWN_SPATIAL_UNIT');
  if (state.contactLinks.some(link => link.active
    && (link.attackerUnitId === unitId || link.defenderUnitId === unitId))) return 'ENGAGED';
  const snapshot = freeze(copy(state));
  const unit = snapshot.units.find(candidate => candidate.unitId === unitId);
  let incomplete = false;
  for (const other of snapshot.units) {
    if (other.unitId === unitId) continue;
    const enemy = readTruth(geometry, 'areEnemies', unit, other);
    if (enemy === false) continue;
    if (enemy === UNKNOWN) { incomplete = true; continue; }
    const inside = readTruth(geometry, 'isInControl', unit, other);
    if (inside === true) return 'THREATENED';
    if (inside === UNKNOWN) incomplete = true;
  }
  return incomplete ? UNKNOWN : 'FREE';
}

/** Same-unit scalar minimum from §4.1. No troop conversion/allocation/rounding. */
export function calculateEffectiveFrontage(input) {
  assertJson(input);
  const keys = ['ownAvailableSideFrontage', 'enemyAvailableSideFrontage', 'contactWidth', 'terrainFrontageLimit'];
  exactKeys(input, ['frontageUnit', ...keys], 'INVALID_FRONTAGE_INPUT');
  invariant(validId(input.frontageUnit), 'FRONTAGE_UNIT_REQUIRED');
  for (const key of keys) invariant(typeof input[key] === 'number'
    && Number.isFinite(input[key]) && input[key] >= 0, `INVALID_FRONTAGE_LIMIT:${key}`);
  return {frontageUnit: input.frontageUnit, value: Math.min(...keys.map(key => input[key]))};
}

function validateGrants(grants, idKey, knownIds, permittedFields) {
  invariant(Array.isArray(grants), 'INVALID_DISCLOSURE_GRANTS');
  for (const grant of grants) {
    exactKeys(grant, [idKey, 'publicId', 'fields'], 'INVALID_DISCLOSURE_GRANT');
    invariant(validId(grant[idKey]) && knownIds.has(grant[idKey]) && validId(grant.publicId), 'INVALID_DISCLOSURE_REFERENCE');
    invariant(Array.isArray(grant.fields) && grant.fields.every(field => permittedFields.includes(field))
      && new Set(grant.fields).size === grant.fields.length, 'INVALID_DISCLOSURE_FIELDS');
  }
  uniqueIds(grants, idKey, 'DUPLICATE_DISCLOSURE_REFERENCE');
  uniqueIds(grants, 'publicId', 'DUPLICATE_PUBLIC_ID');
}

function disclosedFields(record, grant, fields) {
  return Object.fromEntries(fields.map(field => [field, grant.fields.includes(field) ? copy(record[field]) : UNKNOWN]));
}

/**
 * Explicit allowlist projection. Visibility does not imply all-field disclosure.
 * Grants/aliases come from a trusted observation adapter, NOT player requests.
 * Granting an opaque geometry field authorizes its whole JSON payload; adapters
 * must not embed secret caches in these fields. No hidden contacts/threat queries
 * are used to derive a public unit's state. An observed active link proves
 * ENGAGED; absence of such a link proves neither FREE nor THREATENED.
 */
export function projectCombatSpace(state, disclosure) {
  validateCombatSpace(state);
  assertJson(disclosure);
  exactKeys(disclosure, ['unitGrants', 'contactGrants'], 'INVALID_DISCLOSURE');
  const units = new Map(state.units.map(unit => [unit.unitId, unit]));
  const contacts = new Map(state.contactLinks.map(link => [link.contactId, link]));
  validateGrants(disclosure.unitGrants, 'unitId', units, PUBLIC_UNIT_FIELDS);
  validateGrants(disclosure.contactGrants, 'contactId', contacts, PUBLIC_CONTACT_FIELDS);
  const aliases = new Map(disclosure.unitGrants.map(grant => [grant.unitId, grant.publicId]));
  const publicContacts = disclosure.contactGrants.map(grant => {
    const link = contacts.get(grant.contactId);
    invariant(aliases.has(link.attackerUnitId) && aliases.has(link.defenderUnitId), 'CONTACT_ENDPOINT_NOT_DISCLOSED');
    return {
      contactId: grant.publicId,
      attackerUnitId: aliases.get(link.attackerUnitId),
      defenderUnitId: aliases.get(link.defenderUnitId),
      ...disclosedFields(link, grant, PUBLIC_CONTACT_FIELDS),
    };
  });
  const observedEngaged = new Set(publicContacts.filter(link => link.active === true)
    .flatMap(link => [link.attackerUnitId, link.defenderUnitId]));
  return {
    format: 'combat-space-view-v1', frontageUnit: state.frontageUnit,
    units: disclosure.unitGrants.map(grant => ({
      unitId: grant.publicId,
      ...disclosedFields(units.get(grant.unitId), grant, PUBLIC_UNIT_FIELDS),
      contactState: observedEngaged.has(grant.publicId) ? 'ENGAGED' : UNKNOWN,
    })),
    contactLinks: publicContacts,
  };
}

// These are independent snapshots, not a migration of existing campaign saves.
// Restoring must revalidate geometry with the same caller-owned rules/version.
export function serializeCombatSpace(state, geometry) {
  return JSON.stringify(validateCombatSpaceGeometry(state, geometry));
}

export function deserializeCombatSpace(serialized, geometry) {
  invariant(typeof serialized === 'string', 'INVALID_SPACE_SERIALIZATION');
  return validateCombatSpaceGeometry(JSON.parse(serialized), geometry);
}
