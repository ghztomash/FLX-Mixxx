// Pioneer-DDJ-FLX2-ghz-script.js
// ****************************************************************************
// * Mixxx mapping script file for the Pioneer DDJ-FLX2.
// * Mostly adapted from the DDJ-400 mapping script
// * Authors: Warker, nschloe, dj3730, jusko, Robert904, tomash_ghz
// ****************************************************************************
//
//  Implemented (as per manufacturer's manual):
//      * Mixer Section (Faders, EQ, Filter, Gain, Cue)
//      * Browsing and loading + Waveform zoom (shift)
//      * Jogwheels, Scratching, Bending
//      * Beat Sync
//      * Hot Cue Mode
//      * Beat Loop Mode
//      * Beat Jump Mode
//      * Sampler Mode
//      * Keyshift mode
//
//  Custom (Mixxx specific mappings):
//      * BeatFX: Assigned Effect Unit 1
//                v FX_SELECT Load next effect.
//                SHIFT + v FX_SELECT Load previous effect.
//                < LEFT Cycle effect focus leftward
//                > RIGHT Cycle effect focus rightward
//                ON/OFF toggles focused effect slot
//                SHIFT + ON/OFF disables all three effect slots.
//
//      * Toggle quantize (Shift + channel cue)
//      * Stems selection using PADs (using controller's Keyboard mode)
//      * Library mode (Shift + Smart Fader)
//
//  Not implemented (after discussion and trial attempts):
//      * Secondary pad modes (trial attempts complex and too experimental)
//        * Keyboard mode
//        * Pad FX1
//        * Pad FX2
//
//  Not implemented yet (but might be in the future):
//      * Smart CFX

var PioneerDDJFLX2GHz = {};

PioneerDDJFLX2GHz.lights = {
    smartFader: {
        status: 0x96,
        data1: 0x01,
    },
    shiftSmartFader: {
        status: 0x96,
        data1: 0x09,
    },
    beatFx: {
        status: 0x94,
        data1: 0x47,
    },
    shiftBeatFx: {
        status: 0x94,
        data1: 0x43,
    },
    deck1: {
        playPause: {
            status: 0x90,
            data1: 0x0B,
        },
        shiftPlayPause: {
            status: 0x90,
            data1: 0x47,
        },
        cue: {
            status: 0x90,
            data1: 0x0C,
        },
        shiftCue: {
            status: 0x90,
            data1: 0x48,
        },
        hotcueMode: {
            status: 0x90,
            data1: 0x00,
        },
        keyboardMode: {
            status: 0x90,
            data1: 0x69,
        },
        padFX1Mode: {
            status: 0x90,
            data1: 0x1E,
        },
        padFX2Mode: {
            status: 0x90,
            data1: 0x6B,
        },
        beatJumpMode: {
            status: 0x90,
            data1: 0x05,
        },
        beatLoopMode: {
            status: 0x90,
            data1: 0x01,
        },
        samplerMode: {
            status: 0x90,
            data1: 0x03,
        },
        keyShiftMode: {
            status: 0x90,
            data1: 0x6F,
        },
    },
    deck2: {
        playPause: {
            status: 0x91,
            data1: 0x0B,
        },
        shiftPlayPause: {
            status: 0x91,
            data1: 0x47,
        },
        cue: {
            status: 0x91,
            data1: 0x0C,
        },
        shiftCue: {
            status: 0x91,
            data1: 0x48,
        },
        hotcueMode: {
            status: 0x91,
            data1: 0x00,
        },
        keyboardMode: {
            status: 0x91,
            data1: 0x69,
        },
        padFX1Mode: {
            status: 0x91,
            data1: 0x1E,
        },
        padFX2Mode: {
            status: 0x91,
            data1: 0x6B,
        },
        beatJumpMode: {
            status: 0x91,
            data1: 0x05,
        },
        beatLoopMode: {
            status: 0x91,
            data1: 0x01,
        },
        samplerMode: {
            status: 0x91,
            data1: 0x03,
        },
        keyShiftMode: {
            status: 0x91,
            data1: 0x6F,
        },
    },
};

// Store timer IDs
PioneerDDJFLX2GHz.timers = {};

// Keep alive timer
PioneerDDJFLX2GHz.sendKeepAlive = function() {
    midi.sendSysexMsg([0xF0, 0x00, 0x40, 0x05, 0x00, 0x00, 0x04, 0x05, 0x00, 0x50, 0x02, 0xf7], 12); // This was reverse engineered with Wireshark
};

// Jog wheel constants
PioneerDDJFLX2GHz.vinylMode = true;
PioneerDDJFLX2GHz.alpha = 1.0/8;
PioneerDDJFLX2GHz.beta = PioneerDDJFLX2GHz.alpha/32;

// Multiplier for fast seek through track using SHIFT+JOGWHEEL
PioneerDDJFLX2GHz.fastSeekScale = 150;
PioneerDDJFLX2GHz.jogwheelSensitivity = 1.5;

PioneerDDJFLX2GHz.tempoRanges = [0.06, 0.10, 0.16, 1.00];

PioneerDDJFLX2GHz.shiftButtonDown = [false, false];
PioneerDDJFLX2GHz.libraryMode = false;
PioneerDDJFLX2GHz.libraryModeBlinkTimer = undefined;
PioneerDDJFLX2GHz.libraryModeJogScrollAccumulator = 0;
PioneerDDJFLX2GHz.libraryModeJogScrollDivisor = 8;
PioneerDDJFLX2GHz.suppressNextSmartFaderShift = false;

// Beatjump pad (beatjump_size values)
PioneerDDJFLX2GHz.beatjumpSizeForPad = {
    0x10: -1, // PAD 1
    0x11: 1,  // PAD 2
    0x12: -2, // PAD 3
    0x13: 2,  // PAD 4
    0x14: -4, // PAD 5
    0x15: 4,  // PAD 6
    0x16: -8, // PAD 7
    0x17: 8   // PAD 8
};

PioneerDDJFLX2GHz.beatloopShiftBeatjumpSizeForPad = {
    0x60: -1,  // PAD 1
    0x61: 1,   // PAD 2
    0x62: -4,  // PAD 3
    0x63: 4,   // PAD 4
    0x64: -8,  // PAD 5
    0x65: 8,   // PAD 6
    0x66: -16, // PAD 7
    0x67: 16   // PAD 8
};

// Stems (KEYBOARD) pads mode status for deck 1 and 2, without or with SHIFT pressed
PioneerDDJFLX2GHz.stemsPadsModesStatus = {
    "[Channel1]": [0x97, 0x98],
    "[Channel2]": [0x99, 0x9a],
};

// Stems (KEYBOARD) pad 1 control (pad control = [this value] + [pad  number] - 1)
PioneerDDJFLX2GHz.stemMutePadsFirstControl = 0x40;

// Stems (KEYBOARD) pad 5 control (pad control = [this value] + [pad  number] - 1)
PioneerDDJFLX2GHz.stemFxPadsFirstControl = 0x44;

PioneerDDJFLX2GHz.stemPadState = {
    "[Channel1]": {
        fx: [false, false, false, false],
        loaded: false,
        mute: [false, false, false, false],
    },
    "[Channel2]": {
        fx: [false, false, false, false],
        loaded: false,
        mute: [false, false, false, false],
    },
};

// Pitch shift (KEY SHIFT) pads mode status for deck 1 and 2, without or with SHIFT pressed
PioneerDDJFLX2GHz.pitchPadsModesStatus = {
    "[Channel1]": [0x97, 0x98],
    "[Channel2]": [0x99, 0x9a],
};

// Pitch shift (KEY SHIFT) pad 1 control (pad control = [this value] + [pad  number] - 1)
PioneerDDJFLX2GHz.pitchPadsFirstControl = 0x70;

PioneerDDJFLX2GHz.libraryFocusWidget = {
    none: 0,
    searchbar: 1,
    sidebar: 2,
    tracksTable: 3,
};

// Used for tempo slider
PioneerDDJFLX2GHz.highResMSB = {
    "[Channel1]": {},
    "[Channel2]": {}
};

PioneerDDJFLX2GHz.trackLoadedLED = function(value, group, _control) {
    midi.sendShortMsg(
        0x9F,
        group.match(script.channelRegEx)[1] - 1,
        value > 0 ? 0x7F : 0x00
    );
};

PioneerDDJFLX2GHz.toggleLight = function(midiIn, active) {
    midi.sendShortMsg(midiIn.status, midiIn.data1, active ? 0x7F : 0);
};

PioneerDDJFLX2GHz.quantizeChanged = function(value, group, _control) {
    const enabled = value > 0;
    const status = group === "[Channel1]" ? 0x90 : 0x91;
    const shiftedInputNote = group === "[Channel1]" ? 0x08 : 0x07;
    const ledValue = enabled ? 0x7F : 0x00;

    midi.sendShortMsg(status, 0x39, ledValue);
    midi.sendShortMsg(status, shiftedInputNote, ledValue);
};

//
// Init
//

PioneerDDJFLX2GHz.init = function() {
    engine.setValue("[EffectRack1_EffectUnit1]", "show_focus", 1);

    engine.softTakeover("[Channel1]", "rate", true);
    engine.softTakeover("[Channel2]", "rate", true);
    engine.softTakeover("[EffectRack1_EffectUnit1_Effect1]", "meta", true);
    engine.softTakeover("[EffectRack1_EffectUnit1_Effect2]", "meta", true);
    engine.softTakeover("[EffectRack1_EffectUnit1_Effect3]", "meta", true);
    engine.softTakeover("[EffectRack1_EffectUnit1]", "mix", true);

    const samplerCount = 16;
    if (engine.getValue("[App]", "num_samplers") < samplerCount) {
        engine.setValue("[App]", "num_samplers", samplerCount);
    }
    for (let i = 1; i <= samplerCount; ++i) {
        engine.makeConnection("[Sampler" + i + "]", "play", PioneerDDJFLX2GHz.samplerPlayOutputCallbackFunction);
    }

    engine.makeConnection("[Channel1]", "track_loaded", PioneerDDJFLX2GHz.trackLoadedLED);
    engine.makeConnection("[Channel2]", "track_loaded", PioneerDDJFLX2GHz.trackLoadedLED);
    engine.makeConnection("[Channel1]", "quantize", PioneerDDJFLX2GHz.quantizeChanged);
    engine.makeConnection("[Channel2]", "quantize", PioneerDDJFLX2GHz.quantizeChanged);

    // play the "track loaded" animation on both decks at startup
    midi.sendShortMsg(0x9F, 0x00, 0x7F);
    midi.sendShortMsg(0x9F, 0x01, 0x7F);
    PioneerDDJFLX2GHz.quantizeChanged(engine.getValue("[Channel1]", "quantize"), "[Channel1]");
    PioneerDDJFLX2GHz.quantizeChanged(engine.getValue("[Channel2]", "quantize"), "[Channel2]");

    for (i = 1; i <= 3; i++) {
        engine.makeConnection("[EffectRack1_EffectUnit1_Effect" + i +"]", "enabled", PioneerDDJFLX2GHz.toggleFxLight);
    }
    engine.makeConnection("[EffectRack1_EffectUnit1]", "focused_effect", PioneerDDJFLX2GHz.toggleFxLight);

    engine.makeConnection("[Channel1]", "track_loaded", PioneerDDJFLX2GHz.stemStateReset);
    engine.makeConnection("[Channel2]", "track_loaded", PioneerDDJFLX2GHz.stemStateReset);

    // Register callbacks for each deck, when a file is loaded to reset pitch shift
    engine.makeConnection("[Channel1]", "track_loaded", PioneerDDJFLX2GHz.pitchAdjusted);
    engine.makeConnection("[Channel2]", "track_loaded", PioneerDDJFLX2GHz.pitchAdjusted);

    // Register callbacks for each deck, when the pitch shift is modified
    engine.makeConnection("[Channel1]", "pitch_adjust", PioneerDDJFLX2GHz.pitchAdjusted);
    engine.makeConnection("[Channel2]", "pitch_adjust", PioneerDDJFLX2GHz.pitchAdjusted);

    PioneerDDJFLX2GHz.keepAliveTimer = engine.beginTimer(200, PioneerDDJFLX2GHz.sendKeepAlive);

    // query the controller for current control positions on startup
    PioneerDDJFLX2GHz.sendKeepAlive(); // the query seems to double as a keep alive message
    PioneerDDJFLX2GHz.stemPadState["[Channel1]"].loaded = engine.getValue("[Channel1]", "track_loaded") > 0;
    PioneerDDJFLX2GHz.stemPadState["[Channel2]"].loaded = engine.getValue("[Channel2]", "track_loaded") > 0;
    PioneerDDJFLX2GHz.refreshStemPads("[Channel1]");
    PioneerDDJFLX2GHz.refreshStemPads("[Channel2]");
};

//
// Waveform zoom
//

PioneerDDJFLX2GHz.waveformZoom = function(midichan, control, value, status, group) {
    if (value === 0x7f) {
        script.triggerControl(group, "waveform_zoom_up", 100);
    } else {
        script.triggerControl(group, "waveform_zoom_down", 100);
    }
};

PioneerDDJFLX2GHz.getRotaryDelta = function(value) {
    return value >= 0x40 ? value - 0x80 : value;
};

PioneerDDJFLX2GHz.browseRotate = function(_channel, _control, value, _status, _group) {
    const delta = PioneerDDJFLX2GHz.getRotaryDelta(value);
    if (delta === 0) {
        return;
    }

    if (engine.getValue("[Skin]", "show_maximized_library") === 0) {
        engine.setValue("[Skin]", "show_maximized_library", 1);
        if (engine.getValue("[Library]", "focused_widget") !== PioneerDDJFLX2GHz.libraryFocusWidget.tracksTable) {
            engine.setValue("[Library]", "focused_widget", PioneerDDJFLX2GHz.libraryFocusWidget.tracksTable);
        }
    } else {
        engine.setValue("[Library]", "MoveVertical", delta);
    }
};

PioneerDDJFLX2GHz.browsePress = function(_channel, _control, value, _status, _group) {
    if (value === 0) {
        return;
    }

    if (engine.getValue("[Library]", "focused_widget") === PioneerDDJFLX2GHz.libraryFocusWidget.sidebar) {
        script.triggerControl("[Library]", "GoToItem");
    }
};

PioneerDDJFLX2GHz.browseShiftPress = function(_channel, _control, value, _status, _group) {
    if (value === 0) {
        return;
    }

    const focusedWidget = engine.getValue("[Library]", "focused_widget");

    if (focusedWidget === PioneerDDJFLX2GHz.libraryFocusWidget.tracksTable) {
        engine.setValue("[Library]", "focused_widget", PioneerDDJFLX2GHz.libraryFocusWidget.sidebar);
    } else if (focusedWidget === PioneerDDJFLX2GHz.libraryFocusWidget.sidebar) {
        script.triggerControl("[Library]", "MoveLeft");
    }
};

PioneerDDJFLX2GHz.loadSelectedTrack = function(_channel, _control, value, _status, group) {
    if (value === 0) {
        return;
    }

    if (engine.getValue("[Skin]", "show_maximized_library") > 0) {
        engine.setValue("[Skin]", "show_maximized_library", 0);
    }

    script.triggerControl(group, "LoadSelectedTrack");
};

PioneerDDJFLX2GHz.setSmartFaderLight = function(value) {
    midi.sendShortMsg(PioneerDDJFLX2GHz.lights.smartFader.status, PioneerDDJFLX2GHz.lights.smartFader.data1, value);
    midi.sendShortMsg(PioneerDDJFLX2GHz.lights.shiftSmartFader.status, PioneerDDJFLX2GHz.lights.shiftSmartFader.data1, value);
};

PioneerDDJFLX2GHz.startLibraryModeBlink = function() {
    let value = 0x7F;

    PioneerDDJFLX2GHz.stopLibraryModeBlink();
    PioneerDDJFLX2GHz.setSmartFaderLight(value);
    PioneerDDJFLX2GHz.libraryModeBlinkTimer = engine.beginTimer(300, () => {
        value = 0x7F - value;
        PioneerDDJFLX2GHz.setSmartFaderLight(value);
    });
};

PioneerDDJFLX2GHz.stopLibraryModeBlink = function() {
    if (PioneerDDJFLX2GHz.libraryModeBlinkTimer !== undefined) {
        engine.stopTimer(PioneerDDJFLX2GHz.libraryModeBlinkTimer);
        PioneerDDJFLX2GHz.libraryModeBlinkTimer = undefined;
    }
    PioneerDDJFLX2GHz.setSmartFaderLight(0x00);
};

PioneerDDJFLX2GHz.enterLibraryMode = function() {
    PioneerDDJFLX2GHz.libraryMode = true;
    engine.scratchDisable(1);
    engine.scratchDisable(2);
    engine.setValue("[Skin]", "show_maximized_library", 1);
    engine.setValue("[Library]", "focused_widget", PioneerDDJFLX2GHz.libraryFocusWidget.tracksTable);
    PioneerDDJFLX2GHz.startLibraryModeBlink();
};

PioneerDDJFLX2GHz.exitLibraryMode = function() {
    PioneerDDJFLX2GHz.libraryMode = false;
    engine.setValue("[Skin]", "show_maximized_library", 0);
    PioneerDDJFLX2GHz.stopLibraryModeBlink();
};

PioneerDDJFLX2GHz.smartFaderPressed = function(_channel, _control, value) {
    if (value === 0) {
        return;
    }

    if (PioneerDDJFLX2GHz.libraryMode) {
        PioneerDDJFLX2GHz.suppressNextSmartFaderShift =
            PioneerDDJFLX2GHz.shiftButtonDown[0] || PioneerDDJFLX2GHz.shiftButtonDown[1];
        PioneerDDJFLX2GHz.exitLibraryMode();
    }
};

PioneerDDJFLX2GHz.smartFaderShiftPressed = function(_channel, _control, value) {
    if (value === 0) {
        return;
    }

    if (PioneerDDJFLX2GHz.suppressNextSmartFaderShift) {
        PioneerDDJFLX2GHz.suppressNextSmartFaderShift = false;
        return;
    }

    if (PioneerDDJFLX2GHz.libraryMode) {
        PioneerDDJFLX2GHz.exitLibraryMode();
    } else {
        PioneerDDJFLX2GHz.enterLibraryMode();
    }
};

PioneerDDJFLX2GHz.libraryModeJogScroll = function(value) {
    const delta = value - 64;
    if (delta === 0) {
        return;
    }

    PioneerDDJFLX2GHz.libraryModeJogScrollAccumulator += delta;

    const scrollSteps = Math.trunc(
        PioneerDDJFLX2GHz.libraryModeJogScrollAccumulator / PioneerDDJFLX2GHz.libraryModeJogScrollDivisor
    );

    if (scrollSteps === 0) {
        return;
    }

    PioneerDDJFLX2GHz.libraryModeJogScrollAccumulator -=
        scrollSteps * PioneerDDJFLX2GHz.libraryModeJogScrollDivisor;
    engine.setValue("[Library]", "MoveVertical", scrollSteps);
};

PioneerDDJFLX2GHz.playPressed = function(_channel, _control, value, _status, group) {
    if (value === 0) {
        return;
    }

    script.toggleControl(group, "play");
};

PioneerDDJFLX2GHz.headphoneCuePressed = function(_channel, _control, value, _status, group) {
    if (value === 0) {
        return;
    }

    if (!PioneerDDJFLX2GHz.libraryMode) {
        script.toggleControl(group, "pfl");
    } else if (group === "[Channel1]") {
        PioneerDDJFLX2GHz.browseShiftPress(_channel, _control, value, _status, group);
    } else {
        PioneerDDJFLX2GHz.browsePress(_channel, _control, value, _status, group);
    }
};

//
// Effects
//

PioneerDDJFLX2GHz.toggleFxLight = function(_value, _group, _control) {
    const enabled = engine.getValue(PioneerDDJFLX2GHz.focusedFxGroup(), "enabled");

    PioneerDDJFLX2GHz.toggleLight(PioneerDDJFLX2GHz.lights.beatFx, enabled);
    PioneerDDJFLX2GHz.toggleLight(PioneerDDJFLX2GHz.lights.shiftBeatFx, enabled);
};

PioneerDDJFLX2GHz.focusedFxGroup = function() {
    const focusedFx = engine.getValue("[EffectRack1_EffectUnit1]", "focused_effect");
    return "[EffectRack1_EffectUnit1_Effect" + focusedFx + "]";
};

PioneerDDJFLX2GHz.beatFxLevelDepthRotate = function(_channel, _control, value) {
    if (PioneerDDJFLX2GHz.shiftButtonDown[0] || PioneerDDJFLX2GHz.shiftButtonDown[1]) {
        engine.softTakeoverIgnoreNextValue("[EffectRack1_EffectUnit1]", "mix");
        engine.setParameter(PioneerDDJFLX2GHz.focusedFxGroup(), "meta", value / 0x7F);
    } else {
        engine.softTakeoverIgnoreNextValue(PioneerDDJFLX2GHz.focusedFxGroup(), "meta");
        engine.setParameter("[EffectRack1_EffectUnit1]", "mix", value / 0x7F);
    }
};

PioneerDDJFLX2GHz.changeFocusedEffectBy = function(numberOfSteps) {
    let focusedEffect = engine.getValue("[EffectRack1_EffectUnit1]", "focused_effect");

    // Convert to zero-based index
    focusedEffect -= 1;

    // Standard Euclidean modulo by use of two plain modulos
    const numberOfEffectsPerEffectUnit = 3;
    focusedEffect = (((focusedEffect + numberOfSteps) % numberOfEffectsPerEffectUnit) + numberOfEffectsPerEffectUnit) % numberOfEffectsPerEffectUnit;

    // Convert back to one-based index
    focusedEffect += 1;

    engine.setValue("[EffectRack1_EffectUnit1]", "focused_effect", focusedEffect);
};

PioneerDDJFLX2GHz.beatFxSelectPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    engine.setValue(PioneerDDJFLX2GHz.focusedFxGroup(), "next_effect", value);
};

PioneerDDJFLX2GHz.beatFxSelectShiftPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    engine.setValue(PioneerDDJFLX2GHz.focusedFxGroup(), "prev_effect", value);
};

PioneerDDJFLX2GHz.beatFxLeftPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    PioneerDDJFLX2GHz.changeFocusedEffectBy(-1);
};

PioneerDDJFLX2GHz.beatFxRightPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    PioneerDDJFLX2GHz.changeFocusedEffectBy(1);
};

PioneerDDJFLX2GHz.beatFxOnOffPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    const toggleEnabled = !engine.getValue(PioneerDDJFLX2GHz.focusedFxGroup(), "enabled");
    engine.setValue(PioneerDDJFLX2GHz.focusedFxGroup(), "enabled", toggleEnabled);
};

PioneerDDJFLX2GHz.beatFxOnOffShiftPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    engine.setParameter("[EffectRack1_EffectUnit1]", "mix", 0);
    engine.softTakeoverIgnoreNextValue("[EffectRack1_EffectUnit1]", "mix");

    for (let i = 1; i <= 3; i++) {
        engine.setValue("[EffectRack1_EffectUnit1_Effect" + i + "]", "enabled", 0);
    }
    PioneerDDJFLX2GHz.toggleLight(PioneerDDJFLX2GHz.lights.beatFx, false);
    PioneerDDJFLX2GHz.toggleLight(PioneerDDJFLX2GHz.lights.shiftBeatFx, false);
};

PioneerDDJFLX2GHz.beatFxChannel1 = function(_channel, control, value, _status, group) {
    let enableChannel = 0;

    if (value === 0x7f) { enableChannel = 1; }

    engine.setValue(group, "group_[Channel1]_enable", enableChannel);
};

PioneerDDJFLX2GHz.beatFxChannel2 = function(_channel, control, value, _status, group) {
    let enableChannel = 0;

    if (value === 0x7f) { enableChannel = 1; }

    engine.setValue(group, "group_[Channel2]_enable", enableChannel);
};

//
// BEAT SYNC
//
// Note that the controller sends different signals for a short press and a long
// press of the same button.
//

PioneerDDJFLX2GHz.syncPressed = function(channel, control, value, status, group) {
    if (value === 0) {
        return;
    }

    const syncEnabled = engine.getValue(group, "sync_enabled") > 0;
    engine.setValue(group, "sync_enabled", syncEnabled ? 0 : 1);
};

PioneerDDJFLX2GHz.syncLongPressed = function(channel, control, value, status, group) {
    if (value) {
        engine.setValue(group, "sync_leader", 1);
    }
};

PioneerDDJFLX2GHz.padModeSelectPressed = function(_channel, _control, _value, _status, _group) {
    // FLX2 uses Shift + Beat Sync only to arm hardware pad-mode selection.
};

PioneerDDJFLX2GHz.cycleTempoRange = function(_channel, _control, value, _status, group) {
    if (value === 0) { return; } // ignore release

    const currRange = engine.getValue(group, "rateRange");
    let idx = 0;

    for (let i = 0; i < this.tempoRanges.length; i++) {
        if (currRange === this.tempoRanges[i]) {
            // idx get the index of the value in tempoRanges following the currently configured one
            // or cycle back to 0 if the current is the last value of the list.
            idx = (i + 1) % this.tempoRanges.length;
            break;
        }
    }
    engine.setValue(group, "rateRange", this.tempoRanges[idx]);
};

//
// Jog wheels
//

PioneerDDJFLX2GHz.jogTurn = function(channel, _control, value, _status, group) {
    const deckNum = channel + 1;
    // wheel center at 64; <64 rew >64 fwd
    let newVal = value - 64;

    if (PioneerDDJFLX2GHz.libraryMode) {
        if (_control === 0x21) {
            PioneerDDJFLX2GHz.libraryModeJogScroll(value);
        }
        return;
    }

    if (engine.isScratching(deckNum)) {
        engine.scratchTick(deckNum, newVal);
    } else { // fallback
        PioneerDDJFLX2GHz.pitchBendFromJog(group, newVal);
    }
};

PioneerDDJFLX2GHz.pitchBendFromJog = function(group, movement) {
    engine.setValue(group, "jog", movement / 5.0 * PioneerDDJFLX2GHz.jogwheelSensitivity);
};

PioneerDDJFLX2GHz.jogSearch = function(_channel, _control, value, _status, group) {
    if (PioneerDDJFLX2GHz.libraryMode) {
        return;
    }

    const newVal = (value - 64) * PioneerDDJFLX2GHz.fastSeekScale;
    engine.setValue(group, "jog", newVal);
};

PioneerDDJFLX2GHz.jogTouch = function(channel, _control, value) {
    const deckNum = channel + 1;

    if (PioneerDDJFLX2GHz.libraryMode) {
        engine.scratchDisable(deckNum);
        return;
    }

    if (value !== 0 && this.vinylMode) {
        engine.scratchEnable(deckNum, 720, 33+1/3, this.alpha, this.beta);
    } else {
        engine.scratchDisable(deckNum);
    }
};

//
// Shift button
//

PioneerDDJFLX2GHz.shiftPressed = function(channel, _control, value, _status, _group) {
    PioneerDDJFLX2GHz.shiftButtonDown[channel] = value === 0x7F;
};


//
// Tempo sliders
//
// The tempo option in Mixxx's deck preferences determine whether down/up
// increases/decreases the rate. Therefore it must be inverted here so that the
// UI and the control sliders always move in the same direction.
//

PioneerDDJFLX2GHz.tempoSliderMSB = function(channel, control, value, status, group) {
    PioneerDDJFLX2GHz.highResMSB[group].tempoSlider = value;
};

PioneerDDJFLX2GHz.tempoSliderLSB = function(channel, control, value, status, group) {
    const fullValue = (PioneerDDJFLX2GHz.highResMSB[group].tempoSlider << 7) + value;

    engine.setValue(
        group,
        "rate",
        1 - (fullValue / 0x2000)
    );
};

PioneerDDJFLX2GHz.eqHiMsb = function(_channel, _control, value, _status, group) {
    PioneerDDJFLX2GHz.highResMSB[group].eqHi = value;
};

PioneerDDJFLX2GHz.eqHiLsb = function(channel, _control, value, _status, group) {
    const msb = PioneerDDJFLX2GHz.highResMSB[group].eqHi || 0;
    const normalized = ((msb << 7) + value) / 0x3FFF;

    // FLX2 sends absolute knob positions and has no pickup feedback, so this
    // intentionally switches immediately between Hi EQ and shifted Trim.
    if (PioneerDDJFLX2GHz.shiftButtonDown[channel]) {
        engine.setParameter(group, "pregain", normalized);
    } else {
        const eqGroup = "[EqualizerRack1_" + group + "_Effect1]";
        engine.setParameter(eqGroup, "parameter3", normalized);
    }
};

//
// Beat Jump mode
//
// Note that when we increase/decrease the sizes on the pad buttons, we use the
// value of the second pad (0x11) as an upper/lower limit beyond which we don't
// allow further increasing/decreasing of all the values.
//

PioneerDDJFLX2GHz.triggerBeatjump = function(group, jumpSize) {
    engine.setValue(group, "beatjump_size", Math.abs(jumpSize));
    engine.setValue(group, "beatjump", jumpSize);
};

PioneerDDJFLX2GHz.beatjumpPadPressed = function(_channel, control, value, _status, group) {
    if (value === 0) {
        return;
    }
    PioneerDDJFLX2GHz.triggerBeatjump(group, PioneerDDJFLX2GHz.beatjumpSizeForPad[control]);
};

PioneerDDJFLX2GHz.beatloopShiftBeatjumpPadPressed = function(_channel, control, value, _status, group) {
    const jumpSize = PioneerDDJFLX2GHz.beatloopShiftBeatjumpSizeForPad[control];

    if (value === 0 || jumpSize === undefined) {
        return;
    }
    PioneerDDJFLX2GHz.triggerBeatjump(group, jumpSize);
};

PioneerDDJFLX2GHz.increaseBeatjumpSizes = function(_channel, control, value, _status, group) {
    if (value === 0 || PioneerDDJFLX2GHz.beatjumpSizeForPad[0x11] * 16 > 16) {
        return;
    }
    Object.keys(PioneerDDJFLX2GHz.beatjumpSizeForPad).forEach(function(pad) {
        PioneerDDJFLX2GHz.beatjumpSizeForPad[pad] = PioneerDDJFLX2GHz.beatjumpSizeForPad[pad] * 16;
    });
    engine.setValue(group, "beatjump_size", PioneerDDJFLX2GHz.beatjumpSizeForPad[0x11]);
};

PioneerDDJFLX2GHz.decreaseBeatjumpSizes = function(_channel, control, value, _status, group) {
    if (value === 0 || PioneerDDJFLX2GHz.beatjumpSizeForPad[0x11] / 16 < 1/16) {
        return;
    }
    Object.keys(PioneerDDJFLX2GHz.beatjumpSizeForPad).forEach(function(pad) {
        PioneerDDJFLX2GHz.beatjumpSizeForPad[pad] = PioneerDDJFLX2GHz.beatjumpSizeForPad[pad] / 16;
    });
    engine.setValue(group, "beatjump_size", PioneerDDJFLX2GHz.beatjumpSizeForPad[0x11]);
};

//
// Sampler mode
//

PioneerDDJFLX2GHz.samplerPlayOutputCallbackFunction = function(value, group, _control) {
    if (value === 1) {
        const curPad = group.match(script.samplerRegEx)[1];
        let deckIndex = 0;
        let padIndex = 0;

        if (curPad >=1 && curPad <= 4) {
            deckIndex = 0;
            padIndex = curPad - 1;
        } else if (curPad >=5 && curPad <= 8) {
            deckIndex = 2;
            padIndex = curPad - 5;
        } else if (curPad >=9 && curPad <= 12) {
            deckIndex = 0;
            padIndex = curPad - 5;
        } else if (curPad >=13 && curPad <= 16) {
            deckIndex = 2;
            padIndex = curPad - 9;
        }

        PioneerDDJFLX2GHz.startSamplerBlink(
            0x97 + deckIndex,
            0x30 + padIndex,
            group);
    }
};

PioneerDDJFLX2GHz.padModeKeyPressed = function(_channel, _control, value, _status, _group) {
    if (value === 0) {
        return;
    }

    const deck = (_status === 0x90 ? PioneerDDJFLX2GHz.lights.deck1 : PioneerDDJFLX2GHz.lights.deck2);
    const group = _status === 0x90 ? "[Channel1]" : "[Channel2]";

    if (_control === 0x00) {
        PioneerDDJFLX2GHz.toggleLight(deck.hotcueMode, true);
    } else if (_control === 0x69) {
        PioneerDDJFLX2GHz.toggleLight(deck.keyboardMode, true);
        PioneerDDJFLX2GHz.refreshStemPads(group);
    } else if (_control === 0x1E) {
        PioneerDDJFLX2GHz.toggleLight(deck.padFX1Mode, true);
    } else if (_control === 0x6B) {
        PioneerDDJFLX2GHz.toggleLight(deck.padFX2Mode, true);
    } else if (_control === 0x05) {
        PioneerDDJFLX2GHz.toggleLight(deck.beatJumpMode, true);
    } else if (_control === 0x01) {
        PioneerDDJFLX2GHz.toggleLight(deck.beatLoopMode, true);
    } else if (_control === 0x03) {
        PioneerDDJFLX2GHz.toggleLight(deck.samplerMode, true);
    } else if (_control === 0x6F) {
        PioneerDDJFLX2GHz.toggleLight(deck.keyShiftMode, true);
    }
};

PioneerDDJFLX2GHz.samplerPadPressed = function(_channel, _control, value, _status, group) {
    if (engine.getValue(group, "track_loaded")) {
        engine.setValue(group, "cue_gotoandplay", value);
    } else {
        engine.setValue(group, "LoadSelectedTrack", value);
    }
};

PioneerDDJFLX2GHz.samplerPadShiftPressed = function(_channel, _control, value, _status, group) {
    if (engine.getValue(group, "play")) {
        engine.setValue(group, "cue_gotoandstop", value);
    } else if (engine.getValue(group, "track_loaded")) {
        engine.setValue(group, "eject", value);
    }
};

PioneerDDJFLX2GHz.startSamplerBlink = function(channel, control, group) {
    let val = 0x7f;

    PioneerDDJFLX2GHz.stopSamplerBlink(channel, control);
    PioneerDDJFLX2GHz.timers[channel][control] = engine.beginTimer(250, () => {
        val = 0x7f - val;

        // blink the appropriate pad
        midi.sendShortMsg(channel, control, val);
        // also blink the pad while SHIFT is pressed
        midi.sendShortMsg((channel+1), control, val);

        const isPlaying = engine.getValue(group, "play") === 1;

        if (!isPlaying) {
            // kill timer
            PioneerDDJFLX2GHz.stopSamplerBlink(channel, control);
            // set the pad LED to ON
            midi.sendShortMsg(channel, control, 0x7f);
            // set the pad LED to ON while SHIFT is pressed
            midi.sendShortMsg((channel+1), control, 0x7f);
        }
    });
};

PioneerDDJFLX2GHz.stopSamplerBlink = function(channel, control) {
    PioneerDDJFLX2GHz.timers[channel] = PioneerDDJFLX2GHz.timers[channel] || {};

    if (PioneerDDJFLX2GHz.timers[channel][control] !== undefined) {
        engine.stopTimer(PioneerDDJFLX2GHz.timers[channel][control]);
        PioneerDDJFLX2GHz.timers[channel][control] = undefined;
    }
};


PioneerDDJFLX2GHz.toggleQuantize = function(_channel, _control, value, _status, group) {
    if (value === 0) {
        return;
    }

    if (!PioneerDDJFLX2GHz.libraryMode) {
        script.toggleControl(group, "quantize");
        PioneerDDJFLX2GHz.quantizeChanged(engine.getValue(group, "quantize"), group);
    } else {
        script.triggerControl(group, "LoadSelectedTrack");
        PioneerDDJFLX2GHz.exitLibraryMode();
    }
};

//
// Stems mode
//

PioneerDDJFLX2GHz.stemMutePadPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f || !PioneerDDJFLX2GHz.stemPadState[group].loaded) {
        return;
    }

    const stem = control - PioneerDDJFLX2GHz.stemMutePadsFirstControl + 1;
    if (stem < 1 || stem > 4) {
        return;
    }

    const stemGroup = PioneerDDJFLX2GHz.getStemGroup(group, stem);
    const nextValue = !PioneerDDJFLX2GHz.stemPadState[group].mute[stem - 1];

    PioneerDDJFLX2GHz.stemPadState[group].mute[stem - 1] = nextValue;
    engine.setValue(stemGroup, "mute", nextValue ? 1 : 0);
    PioneerDDJFLX2GHz.stemMuteChanged(nextValue ? 1 : 0, stemGroup);
};

PioneerDDJFLX2GHz.stemMutePadShiftPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f || !PioneerDDJFLX2GHz.stemPadState[group].loaded) {
        return;
    }

    const selectedStem = control - PioneerDDJFLX2GHz.stemMutePadsFirstControl + 1;
    if (selectedStem < 1 || selectedStem > 4) {
        return;
    }

    for (let stemIdx = 1; stemIdx <= 4; stemIdx++) {
        const stemGroup = PioneerDDJFLX2GHz.getStemGroup(group, stemIdx);
        const muted = stemIdx !== selectedStem;

        PioneerDDJFLX2GHz.stemPadState[group].mute[stemIdx - 1] = muted;
        engine.setValue(stemGroup, "mute", muted ? 1 : 0);
        PioneerDDJFLX2GHz.stemMuteChanged(muted ? 1 : 0, stemGroup);
    }
};

PioneerDDJFLX2GHz.stemFxPadPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f || !PioneerDDJFLX2GHz.stemPadState[group].loaded) {
        return;
    }

    const stem = control - PioneerDDJFLX2GHz.stemFxPadsFirstControl + 1;
    if (stem < 1 || stem > 4) {
        return;
    }

    const stemGroup = PioneerDDJFLX2GHz.getStemFxGroup(group, stem);
    const nextValue = !PioneerDDJFLX2GHz.stemPadState[group].fx[stem - 1];

    PioneerDDJFLX2GHz.stemPadState[group].fx[stem - 1] = nextValue;
    engine.setValue(stemGroup, "enabled", nextValue ? 1 : 0);
    PioneerDDJFLX2GHz.stemFxChanged(nextValue ? 1 : 0, stemGroup);
};

PioneerDDJFLX2GHz.stemFxPadShiftPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f || !PioneerDDJFLX2GHz.stemPadState[group].loaded) {
        return;
    }

    const stem = control - PioneerDDJFLX2GHz.stemFxPadsFirstControl + 1;
    if (stem < 1 || stem > 4) {
        return;
    }

    const stemGroup = PioneerDDJFLX2GHz.getStemFxGroup(group, stem);

    engine.setValue(stemGroup, "next_chain_preset", 1);
};

PioneerDDJFLX2GHz.getStemGroup = function(group, stem) {
    return `[${group.substring(1, group.length - 1)}_Stem${stem}]`;
};

PioneerDDJFLX2GHz.getStemFxGroup = function(group, stem) {
    return `[QuickEffectRack1_[${group.substring(1, group.length - 1)}_Stem${stem}]]`;
};

PioneerDDJFLX2GHz.refreshStemPads = function(group) {
    for (let stem = 1; stem <= 4; stem++) {
        PioneerDDJFLX2GHz.stemMuteChanged(
            PioneerDDJFLX2GHz.stemPadState[group].mute[stem - 1] ? 1 : 0,
            PioneerDDJFLX2GHz.getStemGroup(group, stem),
        );
        PioneerDDJFLX2GHz.stemFxChanged(
            PioneerDDJFLX2GHz.stemPadState[group].fx[stem - 1] ? 1 : 0,
            PioneerDDJFLX2GHz.getStemFxGroup(group, stem),
        );
    }
};

PioneerDDJFLX2GHz.stemStateReset = function(_value, group, _control) {
    PioneerDDJFLX2GHz.stemPadState[group].loaded = _value > 0;
    PioneerDDJFLX2GHz.stemPadState[group].mute = [false, false, false, false];
    PioneerDDJFLX2GHz.stemPadState[group].fx = [false, false, false, false];
    PioneerDDJFLX2GHz.refreshStemPads(group);
};

PioneerDDJFLX2GHz.stemMuteChanged = function(value, group, _control) {
    const channelStem = group.match(/\[Channel(\d+)_Stem(\d+)\]/);
    if (!channelStem) {
        return;
    }
    const deck = Number(channelStem[1]);
    const stem = Number(channelStem[2]);
    const channel = `[Channel${deck}]`;

    let code = 0x00;
    if (PioneerDDJFLX2GHz.stemPadState[channel].loaded && stem <= 4 && value <= 0.5) {
        code = 0x7f;
    }

    for (let i=0; i<PioneerDDJFLX2GHz.stemsPadsModesStatus[channel].length; i++) {
        midi.sendShortMsg(
            PioneerDDJFLX2GHz.stemsPadsModesStatus[channel][i],
            PioneerDDJFLX2GHz.stemMutePadsFirstControl + stem -1,
            code,
        );
    }
};

PioneerDDJFLX2GHz.stemFxChanged = function(value, group, _control) {
    const channelStem = group.match(/\[QuickEffectRack1_\[Channel(\d+)_Stem(\d+)\]\]/);
    if (!channelStem) {
        return;
    }
    const deck = Number(channelStem[1]);
    const stem = Number(channelStem[2]);
    const channel = `[Channel${deck}]`;
    const code = PioneerDDJFLX2GHz.stemPadState[channel].loaded && value > 0.5 ? 0x7f : 0x00;

    for (let i=0; i<PioneerDDJFLX2GHz.stemsPadsModesStatus[channel].length; i++) {
        midi.sendShortMsg(
            PioneerDDJFLX2GHz.stemsPadsModesStatus[channel][i],
            PioneerDDJFLX2GHz.stemFxPadsFirstControl + stem -1,
            code,
        );
    }
};

//
// Pitch Shift mode
//

PioneerDDJFLX2GHz.pitchAdjusted = function(_value, group, _control) {
    const pitchAdjust = Math.round(engine.getValue(group, "pitch_adjust"));
    let lights = 0b00000000;

    if (pitchAdjust === 0) {
        lights = 0b10000001;
    } else if (pitchAdjust === 1) {
        lights = 0b01000000;
    } else if (pitchAdjust === 2) {
        lights = 0b00100000;
    } else if (pitchAdjust === 3) {
        lights = 0b00010000;
    } else if (pitchAdjust === 4) {
        lights = 0b10010000;
    } else if (pitchAdjust === 5) {
        lights = 0b01010000;
    } else if (pitchAdjust === 6) {
        lights = 0b00110000;
    } else if (pitchAdjust === 7) {
        lights = 0b10110000;
    } else if (pitchAdjust === 8) {
        lights = 0b01110000;
    } else if (pitchAdjust > 8) {
        lights = 0b11110000;
    } else if (pitchAdjust === -1) {
        lights = 0b00000010;
    } else if (pitchAdjust === -2) {
        lights = 0b00000100;
    } else if (pitchAdjust === -3) {
        lights = 0b00001000;
    } else if (pitchAdjust === -4) {
        lights = 0b00001001;
    } else if (pitchAdjust === -5) {
        lights = 0b00001010;
    } else if (pitchAdjust === -6) {
        lights = 0b00001100;
    } else if (pitchAdjust === -7) {
        lights = 0b00001101;
    } else if (pitchAdjust === -8) {
        lights = 0b00001110;
    } else if (pitchAdjust < -8) {
        lights = 0b00001111;
    } else {
        lights = 0b11111111;
    }

    for (let i=0; i<8; i++) {
        let code = 0x00;
        const pad = 0b10000000 >>> i;

        if (lights & pad) {
            code = 0x7f;
        } else {
            code = 0x00;
        }

        PioneerDDJFLX2GHz.pitchPadsModesStatus[group].forEach(
            (padMode) => midi.sendShortMsg(
                padMode,
                PioneerDDJFLX2GHz.pitchPadsFirstControl + i,
                code,
            )
        );
    }
};

PioneerDDJFLX2GHz.pitchPadPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f) {
        return;
    }

    const pad = control - this.pitchPadsFirstControl;
    let pitch = 0;

    if (pad === 0) {
        pitch = 0;
    } else if (pad === 1) {
        pitch = 1;
    } else if (pad === 2) {
        pitch = 2;
    } else if (pad === 3) {
        pitch = 3;
    } else if (pad === 4) {
        pitch = -3;
    } else if (pad === 5) {
        pitch = -2;
    } else if (pad === 6) {
        pitch = -1;
    } else if (pad === 7) {
        pitch = 0;
    }

    engine.setValue(group, "pitch_adjust", pitch);
};

PioneerDDJFLX2GHz.pitchPadShiftPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f) {
        return;
    }

    const pad = control - this.pitchPadsFirstControl;

    let currentPitch = engine.getValue(group, "pitch_adjust");

    if (pad === 0) {
        currentPitch += 1;
    } else if (pad === 1) {
        currentPitch += 2;
    } else if (pad === 2) {
        currentPitch += 3;
    } else if (pad === 3) {
        currentPitch += 4;
    } else if (pad === 4) {
        currentPitch += -4;
    } else if (pad === 5) {
        currentPitch += -3;
    } else if (pad === 6) {
        currentPitch += -2;
    } else if (pad === 7) {
        currentPitch += -1;
    }

    engine.setValue(group, "pitch_adjust", currentPitch);
};


//
// Shutdown
//

PioneerDDJFLX2GHz.shutdown = function() {
    // housekeeping
    // turn off all Sampler LEDs
    for (var i = 0; i <= 7; ++i) {
        midi.sendShortMsg(0x97, 0x30 + i, 0x00);    // Deck 1 pads
        midi.sendShortMsg(0x98, 0x30 + i, 0x00);    // Deck 1 pads with SHIFT
        midi.sendShortMsg(0x99, 0x30 + i, 0x00);    // Deck 2 pads
        midi.sendShortMsg(0x9A, 0x30 + i, 0x00);    // Deck 2 pads with SHIFT
    }
    // turn off all Hotcue LEDs
    for (i = 0; i <= 7; ++i) {
        midi.sendShortMsg(0x97, 0x00 + i, 0x00);    // Deck 1 pads
        midi.sendShortMsg(0x98, 0x00 + i, 0x00);    // Deck 1 pads with SHIFT
        midi.sendShortMsg(0x99, 0x00 + i, 0x00);    // Deck 2 pads
        midi.sendShortMsg(0x9A, 0x00 + i, 0x00);    // Deck 2 pads with SHIFT
    }

    // stop any flashing lights
    PioneerDDJFLX2GHz.stopLibraryModeBlink();
    PioneerDDJFLX2GHz.toggleLight(PioneerDDJFLX2GHz.lights.beatFx, false);
    PioneerDDJFLX2GHz.toggleLight(PioneerDDJFLX2GHz.lights.shiftBeatFx, false);

    // stop the keepalive timer
    engine.stopTimer(PioneerDDJFLX2GHz.keepAliveTimer);
};
