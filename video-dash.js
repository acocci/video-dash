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

    // init the available videos
    this._sourceTracks = this.sourceTracks;

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
    this.setSource(this.dashStreams[0].src);
  },

  setSource: function(src) {
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

    // TODO: edit the original _sourceTracks
    if (stream.type === 'application/dash+xml') {
      // DASH streams add new tracks, disable the native ones
      // this will prevent automatic captioning if the DASH stream doesn't provide any track
      // TODO: maybe remove (instead of disabling) native tracks by saving them in a temp state?
      for (var t in this.textTracks) {
        this.textTracks.item(t).mode = 'disabled';
      }
      this._playDash(stream.src);
    } else {
      // enable a native source
      this.setAttribute('src', stream.src);
      // TODO: enable native tracks (by re-adding them?)
    }
  }

});

