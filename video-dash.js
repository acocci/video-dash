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

  _playDash: function(src) {
    this._getDashPlayer().attachSource(src);
  },

  _videoTracks: undefined,
  get videoTracks() {
    if (typeof this._videoTracks === 'undefined') {
      this._videoTracks = Array
        .fromList(this.querySelectorAll('source'))
        .map(function(node) {
          return {
            src: node.getAttribute('src'),
            type: node.getAttribute('type')
          };
        });
    }
    return this._videoTracks;
  },

  _textTracks: undefined,
  get textTracks() {
    if (typeof this._textTracks === 'undefined') {
      this._textTracks = Array
        .fromList(this.querySelectorAll('track'))
        .map(function (node) {
          return {
            src: node.getAttribute('src'),
            type: node.getAttribute('type'),
            kind: node.getAttribute('kind'),
            label: node.getAttribute('label'),
            srclang: node.getAttribute('srclang')
          };
        });
    }
    return this._textTracks;
  },

  _dashStreams: undefined,
  get dashStreams() {
    if (typeof this._dashStreams === 'undefined') {
      this._dashStreams = this.videoTracks
        .filter(function (track) {
          return (track.type === 'application/dash+xml');
        });
    }
    return this._dashStreams;
  },

  _nativeStreams: undefined,
  get nativeStreams() {
    if (typeof this._nativeStreams === 'undefined') {
      this._nativeStreams = this.videoTracks
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

    // init the available videos and tracks
    this._videoTracks = this.videoTracks;
    this._textTracks = this.textTracks;

    // TODO: consider removing every source and text, then enable those on demand

    // if MSE is supported, get all of the available DASH streams
    // (this gives priority to DASH streams)

    // if there's no DASH stream, get out of here and let the browser handle it
    if (this.dashStreams.length <= 0) {
      return;
    }

    // TODO (maybe?) remove all non-DASH sources so they won't play
    // this.removeNodes('source:not([type="application/dash+xml"])');

    // attach the first DASH streams
    if (this.dashStreams.length > 1) {
      console.info('More than one MPEG-DASH stream specified, selecting the first one...');
    }
    this._playDash(this.dashStreams[0].src);
  },

  setSource: function(src, type) {
    // reset the DASH player, if any
    if (this._player) {
      this._player.reset();
      delete this._player;
    }

    // TODO: edit the original _videoTracks
    if (type === 'application/dash+xml') {
      // DASH streams override any attached track
      this._playDash(src);
      // TODO: disable native tracks (by removing them?)
    } else {
      // enable a native source
      this.setAttribute('src', src);
      // TODO: enable native tracks (by re-adding them?)
    }
  }

});

