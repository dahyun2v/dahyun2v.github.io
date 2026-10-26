// 고도 웹 판 페이지 쪽 다리 — GDScript(host_client.gd)가 JavaScriptBridge 로 부른다.
// SangokuHost.start(호스트 경로) → 워커를 띄움, listen(콜백) → 호스트가 낸 줄을 받음, send(줄) → 호스트 표준 입력으로.
// 사이트 뿌리 = 이 파일 기준 ../../../ (저장소와 같은 폴더 모양으로 올림 — tools/port/web/README.md).
(function () {
  var here = document.currentScript ? document.currentScript.src : location.href;
  var root = new URL('../../../', here);
  var H = {
    root: root.href, worker: null, listener: null, buffered: [],
    start: function (hostPath) {
      var hostUrl = new URL(String(hostPath).replace(/^\/+/, ''), root).href;
      var w = new Worker(new URL('tools/port/web/host-worker.mjs?host=' + encodeURIComponent(hostUrl), root).href, {type: 'module'});
      w.onmessage = function (e) { H._out(String(e.data)); };
      w.onerror = function (e) { H._out(JSON.stringify({id: null, event: 'closed', message: String(e.message || e)})); };
      H.worker = w;
      return true;
    },
    listen: function (cb) {
      H.listener = cb;
      var b = H.buffered; H.buffered = [];
      for (var i = 0; i < b.length; i++) setTimeout(cb, 0, b[i]);
      return true;
    },
    send: function (line) { if (H.worker) H.worker.postMessage(String(line)); return !!H.worker; },
    stop: function () { if (H.worker) H.worker.terminate(); H.worker = null; return true; },
    // 파일 도우미(ExtFile.gd): 고도 경로 → 사이트 주소. "../../prototype/x" · "assets/data/x" 둘 다 port/godot 기준
    siteUrl: function (p) { return new URL(String(p), new URL('port/godot/', root)).href; },
    // 동기 받기(그림 · 소리 — 고도 쪽이 동기로 읽음). 메인 스레드라 바이너리는 x-user-defined 꼴로 받아 바이트로 바꿈. 없으면 null
    fetchBytes: function (url) {
      var x = new XMLHttpRequest();
      x.open('GET', url, false);
      x.overrideMimeType('text/plain; charset=x-user-defined');
      try { x.send(); } catch (e) { return null; }
      if (x.status < 200 || x.status >= 300) return null;
      var s = x.responseText, n = s.length, b = new Uint8Array(n);
      for (var i = 0; i < n; i++) b[i] = s.charCodeAt(i) & 0xff;
      return b.buffer;
    },
    exists: function (url) {
      var x = new XMLHttpRequest();
      x.open('HEAD', url, false);
      try { x.send(); } catch (e) { return false; }
      return x.status >= 200 && x.status < 300;
    },
    // 줄은 다음 틱에 넘김(GDScript 가 send 뒤 await 하기 전에 응답이 오지 않게)
    _out: function (line) { if (H.listener) setTimeout(H.listener, 0, line); else H.buffered.push(line); },
  };
  window.SangokuHost = H;
})();
