'use strict';

Array.fromList = function(list) {
  var array = new Array(list.length);
  for (var i = 0, n = list.length; i < n; i++) {
    array[i] = list[i];
  }
  return array;
};

var removeNodes = function(elem, querySelection) {
  Array.prototype.forEach.call(
    this.querySelectorAll(querySelection),
    function(removeThis) {
      removeThis.parentNode.removeChild(removeThis);
    }
  );
};

Polymer('video-dash', {

  _getDashPlayer: function() {
    // create or reuse the DASH player
    if (typeof this._player === 'undefined') {
      var player = this._player = new MediaPlayer(new Dash.di.DashContext());
      player.startup();
      player.attachView(this);
    }
    return this._player;
  },

  _manifest: undefined,

  _sourceTracks: undefined,
  get sourceTracks() {
    if (typeof this._sourceTracks === 'undefined') {
      this._sourceTracks = Array
        .fromList(this.querySelectorAll('source'))
        .map(function(node) {
          return {
            src: node.getAttribute('src'),
            type: node.getAttribute('type')
          };
        });
    }
    return this._sourceTracks;
  },

  _dashStreams: undefined,
  get dashStreams() {
    if (typeof this._dashStreams === 'undefined') {
      this._dashStreams = this.sourceTracks
        .filter(function (track) {
          return (track.type === 'application/dash+xml');
        });
    }
    return this._dashStreams;
  },

  _nativeStreams: undefined,
  get nativeStreams() {
    if (typeof this._nativeStreams === 'undefined') {
      this._nativeStreams = this.sourceTracks
        .filter(function (track) {
          return (track.type !== 'application/dash+xml');
        });
    }
    return this._nativeStreams;
  },

  domReady: function() {
    // if MSE is not supported, remove all DASH streams
    if (typeof MediaSource === 'undefined') {
      removeNodes(this, 'source[type="application/dash+xml"]');
      return;
    }

    // reset the source tracks and streams
    this._manifest = undefined;
    this._sourceTracks = undefined;
    this._dashStreams = undefined;
    this._nativeStreams = undefined;

    // if MSE is supported, get all of the available DASH streams (always give priority to DASH streams)
    // if there's no DASH stream, get out of here and let the browser handle it
    if (this.dashStreams.length <= 0) {
      return;
    }

    // attach the first DASH stream
    if (this.dashStreams.length > 1) {
      console.info('More than one MPEG-DASH stream specified, selecting the first one...');
    }
    this.setSource(this.dashStreams[0].src);
  },

  setSource: function(src) {
    var self = this;

    // reset the DASH player, if any
    if (this._player) {
      this._player.reset();
      delete this._player;
    }

    // find the first matching stream
    var stream = this.sourceTracks
      .filter(function(s) {
        return s.src === src;
      });
    if (stream.length <= 0) {
      console.info('No available stream for "%s".', src);
      return;
    }
    stream = stream[0];

    if (stream.type === 'application/dash+xml') {
      
      // start playing the DASH stream
      this._getDashPlayer().attachSource(stream.src);

      // as soon as the manifest is available
      this._getDashPlayer().adapter.system.getObject('manifestLoader').subscribe(
        MediaPlayer.dependencies.ManifestLoader.eventList.ENAME_MANIFEST_LOADED, function() { },
        function(event) {
          self._manifest = event.data.manifest;
          // find out if there is any subtitle/caption adaptation set
          var dashTextTracks = self._manifest.Period.AdaptationSet.filter(function(adaptation) {
            return (adaptation.mimeType === 'text/vtt');
          }).length;
          // if there is at least one subtitle/caption
          if (dashTextTracks > 0) {
            // disable all other captions
            for (var t in self.textTracks) {
              if (self.textTracks.item(t).mode === 'showing') {
                self._lastNativeTrack = t;
              }
              self.textTracks.item(t).mode = 'disabled';
            }
          }
        });

    } else {

      // enable a native source
      this.setAttribute('src', stream.src);

      // TODO: find a way to remove all DASH tracks
      // (http://stackoverflow.com/questions/29306931/delete-a-texttrack-from-a-video)
      // (https://github.com/Dash-Industry-Forum/dash.js/issues/488)

      // if the last stream type was a DASH one, try to restore the previous track
      if (this._lastStreamType === 'application/dash+xml') {
        self.textTracks.item(this._lastNativeTrack).mode = 'showing';
      }
    }

    // save the new stream type
    this._lastStreamType = stream.type;
  },

  reload: function() {
    return this.domReady();
  },

  load: function() {
    return this.reload();
  }

});

