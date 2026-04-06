// Pioneer-DDJ-FLX4-ghz-script.js
// ****************************************************************************
// * Mixxx mapping script file for the Pioneer DDJ-FLX4.
// * Mostly adapted from the DDJ-400 mapping script
// * Authors: Warker, nschloe, dj3730, jusko, Robert904
// ****************************************************************************
//
//  Implemented (as per manufacturer's manual):
//      * Mixer Section (Faders, EQ, Filter, Gain, Cue)
//      * Browsing and loading + Waveform zoom (shift)
//      * Jogwheels, Scratching, Bending, Loop adjust
//      * Cycle Temporange
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
//      * 32 beat jump forward & back (Shift + </> CUE/LOOP CALL arrows)
//      * Toggle quantize (Shift + channel cue)
//      * Stems selection using PADs (using controller's Keyboard mode)
//
//  Not implemented (after discussion and trial attempts):
//      * Loop Section:
//        * -4BEAT auto loop (hacky---prefer a clean way to set a 4 beat loop
//                            from a previous position on long press)
//
//        * CUE/LOOP CALL - memory & delete (complex and not useful. Hot cues are sufficient)
//
//      * Secondary pad modes (trial attempts complex and too experimental)
//        * Keyboard mode
//        * Pad FX1
//        * Pad FX2
//
//  Not implemented yet (but might be in the future):
//      * Smart CFX
//      * Smart fader

var PioneerDDJFLX4GHz = {};

PioneerDDJFLX4GHz.lights = {
    beatFx: {
        status: 0x94,
        data1: 0x47,
    },
    shiftBeatFx: {
        status: 0x94,
        data1: 0x43,
    },
    deck1: {
        vuMeter: {
            status: 0xB0,
            data1: 0x02,
        },
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
            data1: 0x1B,
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
            data1: 0x20,
        },
        beatLoopMode: {
            status: 0x90,
            data1: 0x6D,
        },
        samplerMode: {
            status: 0x90,
            data1: 0x22,
        },
        keyShiftMode: {
            status: 0x90,
            data1: 0x6F,
        },
    },
    deck2: {
        vuMeter: {
            status: 0xB0,
            data1: 0x02,
        },
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
            data1: 0x1B,
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
            data1: 0x20,
        },
        beatLoopMode: {
            status: 0x91,
            data1: 0x6D,
        },
        samplerMode: {
            status: 0x91,
            data1: 0x22,
        },
        keyShiftMode: {
            status: 0x91,
            data1: 0x6F,
        },
    },
};

// Store timer IDs
PioneerDDJFLX4GHz.timers = {};

// Keep alive timer
PioneerDDJFLX4GHz.sendKeepAlive = function() {
    midi.sendSysexMsg([0xF0, 0x00, 0x40, 0x05, 0x00, 0x00, 0x04, 0x05, 0x00, 0x50, 0x02, 0xf7], 12); // This was reverse engineered with Wireshark
};

// Jog wheel constants
PioneerDDJFLX4GHz.vinylMode = true;
PioneerDDJFLX4GHz.alpha = 1.0/8;
PioneerDDJFLX4GHz.beta = PioneerDDJFLX4GHz.alpha/32;

// Multiplier for fast seek through track using SHIFT+JOGWHEEL
PioneerDDJFLX4GHz.fastSeekScale = 150;
PioneerDDJFLX4GHz.jogwheelSensitivity = 1.0;

PioneerDDJFLX4GHz.tempoRanges = [0.06, 0.10, 0.16, 0.25];

PioneerDDJFLX4GHz.shiftButtonDown = [false, false];

// Jog wheel loop adjust
PioneerDDJFLX4GHz.loopAdjustIn = [false, false];
PioneerDDJFLX4GHz.loopAdjustOut = [false, false];
PioneerDDJFLX4GHz.loopAdjustMultiply = 50;

// Beatjump pad (beatjump_size values)
PioneerDDJFLX4GHz.beatjumpSizeForPad = {
    0x20: -1, // PAD 1
    0x21: 1,  // PAD 2
    0x22: -2, // PAD 3
    0x23: 2,  // PAD 4
    0x24: -4, // PAD 5
    0x25: 4,  // PAD 6
    0x26: -8, // PAD 7
    0x27: 8   // PAD 8
};

// Stems (KEYBOARD) pads mode status for deck 1 and 2, without or with SHIFT pressed
PioneerDDJFLX4GHz.stemsPadsModesStatus = {
    "[Channel1]": [0x97, 0x98],
    "[Channel2]": [0x99, 0x9a],
};

// Stems (KEYBOARD) pad 1 control (pad control = [this value] + [pad  number] - 1)
PioneerDDJFLX4GHz.stemMutePadsFirstControl = 0x40;

// Stems (KEYBOARD) pad 5 control (pad control = [this value] + [pad  number] - 1)
PioneerDDJFLX4GHz.stemFxPadsFirstControl = 0x44;

PioneerDDJFLX4GHz.stemPadState = {
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
PioneerDDJFLX4GHz.pitchPadsModesStatus = {
    "[Channel1]": [0x97, 0x98],
    "[Channel2]": [0x99, 0x9a],
};

// Pitch shift (KEY SHIFT) pad 1 control (pad control = [this value] + [pad  number] - 1)
PioneerDDJFLX4GHz.pitchPadsFirstControl = 0x70;

PioneerDDJFLX4GHz.quickJumpSize = 32;

PioneerDDJFLX4GHz.libraryFocusWidget = {
    none: 0,
    searchbar: 1,
    sidebar: 2,
    tracksTable: 3,
};

// Used for tempo slider
PioneerDDJFLX4GHz.highResMSB = {
    "[Channel1]": {},
    "[Channel2]": {}
};

PioneerDDJFLX4GHz.trackLoadedLED = function(value, group, _control) {
    midi.sendShortMsg(
        0x9F,
        group.match(script.channelRegEx)[1] - 1,
        value > 0 ? 0x7F : 0x00
    );
};

PioneerDDJFLX4GHz.toggleLight = function(midiIn, active) {
    midi.sendShortMsg(midiIn.status, midiIn.data1, active ? 0x7F : 0);
};

//
// Init
//

PioneerDDJFLX4GHz.init = function() {
    engine.setValue("[EffectRack1_EffectUnit1]", "show_focus", 1);

    engine.makeConnection("[Channel1]", "vu_meter", PioneerDDJFLX4GHz.vuMeterUpdate);
    engine.makeConnection("[Channel2]", "vu_meter", PioneerDDJFLX4GHz.vuMeterUpdate);

    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.deck1.vuMeter, false);
    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.deck2.vuMeter, false);

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
        engine.makeConnection("[Sampler" + i + "]", "play", PioneerDDJFLX4GHz.samplerPlayOutputCallbackFunction);
    }

    engine.makeConnection("[Channel1]", "track_loaded", PioneerDDJFLX4GHz.trackLoadedLED);
    engine.makeConnection("[Channel2]", "track_loaded", PioneerDDJFLX4GHz.trackLoadedLED);

    // play the "track loaded" animation on both decks at startup
    midi.sendShortMsg(0x9F, 0x00, 0x7F);
    midi.sendShortMsg(0x9F, 0x01, 0x7F);

    PioneerDDJFLX4GHz.setLoopButtonLights(0x90, 0x7F);
    PioneerDDJFLX4GHz.setLoopButtonLights(0x91, 0x7F);

    engine.makeConnection("[Channel1]", "loop_enabled", PioneerDDJFLX4GHz.loopToggle);
    engine.makeConnection("[Channel2]", "loop_enabled", PioneerDDJFLX4GHz.loopToggle);

    for (i = 1; i <= 3; i++) {
        engine.makeConnection("[EffectRack1_EffectUnit1_Effect" + i +"]", "enabled", PioneerDDJFLX4GHz.toggleFxLight);
    }
    engine.makeConnection("[EffectRack1_EffectUnit1]", "focused_effect", PioneerDDJFLX4GHz.toggleFxLight);

    engine.makeConnection("[Channel1]", "track_loaded", PioneerDDJFLX4GHz.stemStateReset);
    engine.makeConnection("[Channel2]", "track_loaded", PioneerDDJFLX4GHz.stemStateReset);

    // Register callbacks for each deck, when a file is loaded to reset pitch shift
    engine.makeConnection("[Channel1]", "track_loaded", PioneerDDJFLX4GHz.pitchAdjusted);
    engine.makeConnection("[Channel2]", "track_loaded", PioneerDDJFLX4GHz.pitchAdjusted);

    // Register callbacks for each deck, when the pitch shift is modified
    engine.makeConnection("[Channel1]", "pitch_adjust", PioneerDDJFLX4GHz.pitchAdjusted);
    engine.makeConnection("[Channel2]", "pitch_adjust", PioneerDDJFLX4GHz.pitchAdjusted);

    PioneerDDJFLX4GHz.keepAliveTimer = engine.beginTimer(200, PioneerDDJFLX4GHz.sendKeepAlive);

    // query the controller for current control positions on startup
    PioneerDDJFLX4GHz.sendKeepAlive(); // the query seems to double as a keep alive message
    PioneerDDJFLX4GHz.stemPadState["[Channel1]"].loaded = engine.getValue("[Channel1]", "track_loaded") > 0;
    PioneerDDJFLX4GHz.stemPadState["[Channel2]"].loaded = engine.getValue("[Channel2]", "track_loaded") > 0;
    PioneerDDJFLX4GHz.refreshStemPads("[Channel1]");
    PioneerDDJFLX4GHz.refreshStemPads("[Channel2]");
};

//
// Waveform zoom
//

PioneerDDJFLX4GHz.waveformZoom = function(midichan, control, value, status, group) {
    if (value === 0x7f) {
        script.triggerControl(group, "waveform_zoom_up", 100);
    } else {
        script.triggerControl(group, "waveform_zoom_down", 100);
    }
};

PioneerDDJFLX4GHz.getRotaryDelta = function(value) {
    return value >= 0x40 ? value - 0x80 : value;
};

PioneerDDJFLX4GHz.browseRotate = function(_channel, _control, value, _status, _group) {
    const delta = PioneerDDJFLX4GHz.getRotaryDelta(value);
    if (delta === 0) {
        return;
    }

    if (engine.getValue("[Skin]", "show_maximized_library") === 0) {
        engine.setValue("[Skin]", "show_maximized_library", 1);
        if (engine.getValue("[Library]", "focused_widget") !== PioneerDDJFLX4GHz.libraryFocusWidget.tracksTable) {
            engine.setValue("[Library]", "focused_widget", PioneerDDJFLX4GHz.libraryFocusWidget.tracksTable);
        }
    } else {
        engine.setValue("[Library]", "MoveVertical", delta);
    }
};

PioneerDDJFLX4GHz.browsePress = function(_channel, _control, value, _status, _group) {
    if (value === 0) {
        return;
    }

    if (engine.getValue("[Library]", "focused_widget") === PioneerDDJFLX4GHz.libraryFocusWidget.sidebar) {
        script.triggerControl("[Library]", "GoToItem");
    }
};

PioneerDDJFLX4GHz.browseShiftPress = function(_channel, _control, value, _status, _group) {
    if (value === 0) {
        return;
    }

    const focusedWidget = engine.getValue("[Library]", "focused_widget");

    if (focusedWidget === PioneerDDJFLX4GHz.libraryFocusWidget.tracksTable) {
        engine.setValue("[Library]", "focused_widget", PioneerDDJFLX4GHz.libraryFocusWidget.sidebar);
    } else if (focusedWidget === PioneerDDJFLX4GHz.libraryFocusWidget.sidebar) {
        script.triggerControl("[Library]", "MoveLeft");
    }
};

PioneerDDJFLX4GHz.loadSelectedTrack = function(_channel, _control, value, _status, group) {
    if (value === 0) {
        return;
    }

    if (engine.getValue("[Skin]", "show_maximized_library") > 0) {
        engine.setValue("[Skin]", "show_maximized_library", 0);
    }

    script.triggerControl(group, "LoadSelectedTrack");
};

//
// Channel level lights
//

PioneerDDJFLX4GHz.vuMeterUpdate = function(value, group) {
    const newVal = value * 127;

    switch (group) {
    case "[Channel1]":
        midi.sendShortMsg(0xB0, 0x02, newVal);
        break;

    case "[Channel2]":
        midi.sendShortMsg(0xB1, 0x02, newVal);
        break;
    }
};

//
// Effects
//

PioneerDDJFLX4GHz.toggleFxLight = function(_value, _group, _control) {
    const enabled = engine.getValue(PioneerDDJFLX4GHz.focusedFxGroup(), "enabled");

    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.beatFx, enabled);
    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.shiftBeatFx, enabled);
};

PioneerDDJFLX4GHz.focusedFxGroup = function() {
    const focusedFx = engine.getValue("[EffectRack1_EffectUnit1]", "focused_effect");
    return "[EffectRack1_EffectUnit1_Effect" + focusedFx + "]";
};

PioneerDDJFLX4GHz.beatFxLevelDepthRotate = function(_channel, _control, value) {
    if (PioneerDDJFLX4GHz.shiftButtonDown[0] || PioneerDDJFLX4GHz.shiftButtonDown[1]) {
        engine.softTakeoverIgnoreNextValue("[EffectRack1_EffectUnit1]", "mix");
        engine.setParameter(PioneerDDJFLX4GHz.focusedFxGroup(), "meta", value / 0x7F);
    } else {
        engine.softTakeoverIgnoreNextValue(PioneerDDJFLX4GHz.focusedFxGroup(), "meta");
        engine.setParameter("[EffectRack1_EffectUnit1]", "mix", value / 0x7F);
    }
};

PioneerDDJFLX4GHz.changeFocusedEffectBy = function(numberOfSteps) {
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

PioneerDDJFLX4GHz.beatFxSelectPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    engine.setValue(PioneerDDJFLX4GHz.focusedFxGroup(), "next_effect", value);
};

PioneerDDJFLX4GHz.beatFxSelectShiftPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    engine.setValue(PioneerDDJFLX4GHz.focusedFxGroup(), "prev_effect", value);
};

PioneerDDJFLX4GHz.beatFxLeftPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    PioneerDDJFLX4GHz.changeFocusedEffectBy(-1);
};

PioneerDDJFLX4GHz.beatFxRightPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    PioneerDDJFLX4GHz.changeFocusedEffectBy(1);
};

PioneerDDJFLX4GHz.beatFxOnOffPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    const toggleEnabled = !engine.getValue(PioneerDDJFLX4GHz.focusedFxGroup(), "enabled");
    engine.setValue(PioneerDDJFLX4GHz.focusedFxGroup(), "enabled", toggleEnabled);
};

PioneerDDJFLX4GHz.beatFxOnOffShiftPressed = function(_channel, _control, value) {
    if (value === 0) { return; }

    engine.setParameter("[EffectRack1_EffectUnit1]", "mix", 0);
    engine.softTakeoverIgnoreNextValue("[EffectRack1_EffectUnit1]", "mix");

    for (let i = 1; i <= 3; i++) {
        engine.setValue("[EffectRack1_EffectUnit1_Effect" + i + "]", "enabled", 0);
    }
    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.beatFx, false);
    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.shiftBeatFx, false);
};

PioneerDDJFLX4GHz.beatFxChannel1 = function(_channel, control, value, _status, group) {
    let enableChannel = 0;

    if (value === 0x7f) { enableChannel = 1; }

    engine.setValue(group, "group_[Channel1]_enable", enableChannel);
};

PioneerDDJFLX4GHz.beatFxChannel2 = function(_channel, control, value, _status, group) {
    let enableChannel = 0;

    if (value === 0x7f) { enableChannel = 1; }

    engine.setValue(group, "group_[Channel2]_enable", enableChannel);
};

//
// Loop IN/OUT ADJUST
//

PioneerDDJFLX4GHz.toggleLoopAdjustIn = function(channel, _control, value, _status, group) {
    if (value === 0 || engine.getValue(group, "loop_enabled" === 0)) {
        return;
    }
    PioneerDDJFLX4GHz.loopAdjustIn[channel] = !PioneerDDJFLX4GHz.loopAdjustIn[channel];
    PioneerDDJFLX4GHz.loopAdjustOut[channel] = false;
};

PioneerDDJFLX4GHz.toggleLoopAdjustOut = function(channel, _control, value, _status, group) {
    if (value === 0 || engine.getValue(group, "loop_enabled" === 0)) {
        return;
    }
    PioneerDDJFLX4GHz.loopAdjustOut[channel] = !PioneerDDJFLX4GHz.loopAdjustOut[channel];
    PioneerDDJFLX4GHz.loopAdjustIn[channel] = false;
};

// Two signals are sent here so that the light stays lit/unlit in its shift state too
PioneerDDJFLX4GHz.setReloopLight = function(status, value) {
    midi.sendShortMsg(status, 0x4D, value);
    midi.sendShortMsg(status, 0x50, value);
};


PioneerDDJFLX4GHz.setLoopButtonLights = function(status, value) {
    [0x10, 0x11, 0x4E, 0x4C].forEach(function(control) {
        midi.sendShortMsg(status, control, value);
    });
};

PioneerDDJFLX4GHz.startLoopLightsBlink = function(channel, control, status, group) {
    let blink = 0x7F;

    PioneerDDJFLX4GHz.stopLoopLightsBlink(group, control, status);

    PioneerDDJFLX4GHz.timers[group][control] = engine.beginTimer(500, () => {
        blink = 0x7F - blink;

        // When adjusting the loop out position, turn the loop in light off
        if (PioneerDDJFLX4GHz.loopAdjustOut[channel]) {
            midi.sendShortMsg(status, 0x10, 0x00);
            midi.sendShortMsg(status, 0x4C, 0x00);
        } else {
            midi.sendShortMsg(status, 0x10, blink);
            midi.sendShortMsg(status, 0x4C, blink);
        }

        // When adjusting the loop in position, turn the loop out light off
        if (PioneerDDJFLX4GHz.loopAdjustIn[channel]) {
            midi.sendShortMsg(status, 0x11, 0x00);
            midi.sendShortMsg(status, 0x4E, 0x00);
        } else {
            midi.sendShortMsg(status, 0x11, blink);
            midi.sendShortMsg(status, 0x4E, blink);
        }
    });

};

PioneerDDJFLX4GHz.stopLoopLightsBlink = function(group, control, status) {
    PioneerDDJFLX4GHz.timers[group] = PioneerDDJFLX4GHz.timers[group] || {};

    if (PioneerDDJFLX4GHz.timers[group][control] !== undefined) {
        engine.stopTimer(PioneerDDJFLX4GHz.timers[group][control]);
    }
    PioneerDDJFLX4GHz.timers[group][control] = undefined;
    PioneerDDJFLX4GHz.setLoopButtonLights(status, 0x7F);
};

PioneerDDJFLX4GHz.loopToggle = function(value, group, control) {
    const status = group === "[Channel1]" ? 0x90 : 0x91,
        channel = group === "[Channel1]" ? 0 : 1;

    PioneerDDJFLX4GHz.setReloopLight(status, value ? 0x7F : 0x00);

    if (value) {
        PioneerDDJFLX4GHz.startLoopLightsBlink(channel, control, status, group);
    } else {
        PioneerDDJFLX4GHz.stopLoopLightsBlink(group, control, status);
        PioneerDDJFLX4GHz.loopAdjustIn[channel] = false;
        PioneerDDJFLX4GHz.loopAdjustOut[channel] = false;
    }
};

PioneerDDJFLX4GHz.toggleBeatloop = function(_channel, _control, value, _status, group) {
    if (value) {
        const control = engine.getValue(group, "loop_enabled")
            ? "reloop_toggle"
            : "beatloop_activate";
        engine.setValue(group, control, 1);
        engine.setValue(group, control, 0);
    }
};

//
// CUE/LOOP CALL
//

PioneerDDJFLX4GHz.adjustBeatloopSize = function(group, factor) {
    const currentSize = engine.getValue(group, "beatloop_size");
    if (currentSize > 0) {
        engine.setValue(group, "beatloop_size", currentSize * factor);
    }

    if (engine.getValue(group, "loop_enabled")) {
        engine.setValue(group, "loop_scale", factor);
    }
};

PioneerDDJFLX4GHz.cueLoopCallLeft = function(_channel, _control, value, _status, group) {
    if (value) {
        PioneerDDJFLX4GHz.adjustBeatloopSize(group, 0.5);
    }
};

PioneerDDJFLX4GHz.cueLoopCallRight = function(_channel, _control, value, _status, group) {
    if (value) {
        PioneerDDJFLX4GHz.adjustBeatloopSize(group, 2.0);
    }
};

//
// BEAT SYNC
//
// Note that the controller sends different signals for a short press and a long
// press of the same button.
//

PioneerDDJFLX4GHz.syncPressed = function(channel, control, value, status, group) {
    if (engine.getValue(group, "sync_enabled") && value > 0) {
        engine.setValue(group, "sync_enabled", 0);
    } else {
        engine.setValue(group, "beatsync", value);
    }
};

PioneerDDJFLX4GHz.syncLongPressed = function(channel, control, value, status, group) {
    if (value) {
        engine.setValue(group, "sync_enabled", 1);
    }
};

PioneerDDJFLX4GHz.cycleTempoRange = function(_channel, _control, value, _status, group) {
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

PioneerDDJFLX4GHz.jogTurn = function(channel, _control, value, _status, group) {
    const deckNum = channel + 1;
    // wheel center at 64; <64 rew >64 fwd
    let newVal = value - 64;

    if (PioneerDDJFLX4GHz.handleLoopAdjust(channel, group, newVal)) {
        return;
    }

    if (engine.isScratching(deckNum)) {
        engine.scratchTick(deckNum, newVal);
    } else { // fallback
        PioneerDDJFLX4GHz.pitchBendFromJog(group, newVal);
    }
};

PioneerDDJFLX4GHz.pitchBendFromJog = function(group, movement) {
    engine.setValue(group, "jog", movement / 5.0 * PioneerDDJFLX4GHz.jogwheelSensitivity);
};

PioneerDDJFLX4GHz.handleLoopAdjust = function(channel, group, delta) {
    const loopEnabled = engine.getValue(group, "loop_enabled");
    if (loopEnabled <= 0) {
        return false;
    }

    if (PioneerDDJFLX4GHz.loopAdjustIn[channel]) {
        const newPosition = delta * PioneerDDJFLX4GHz.loopAdjustMultiply
            + engine.getValue(group, "loop_start_position");
        engine.setValue(group, "loop_start_position", newPosition);
        return true;
    }

    if (PioneerDDJFLX4GHz.loopAdjustOut[channel]) {
        const newPosition = delta * PioneerDDJFLX4GHz.loopAdjustMultiply
            + engine.getValue(group, "loop_end_position");
        engine.setValue(group, "loop_end_position", newPosition);
        return true;
    }

    return false;
};

PioneerDDJFLX4GHz.jogSearch = function(_channel, _control, value, _status, group) {
    const newVal = (value - 64) * PioneerDDJFLX4GHz.fastSeekScale;
    engine.setValue(group, "jog", newVal);
};

PioneerDDJFLX4GHz.jogTouch = function(channel, _control, value) {
    const deckNum = channel + 1;

    // skip while adjusting the loop points
    if (PioneerDDJFLX4GHz.loopAdjustIn[channel] || PioneerDDJFLX4GHz.loopAdjustOut[channel]) {
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

PioneerDDJFLX4GHz.shiftPressed = function(channel, _control, value, _status, _group) {
    PioneerDDJFLX4GHz.shiftButtonDown[channel] = value === 0x7F;
};


//
// Tempo sliders
//
// The tempo option in Mixxx's deck preferences determine whether down/up
// increases/decreases the rate. Therefore it must be inverted here so that the
// UI and the control sliders always move in the same direction.
//

PioneerDDJFLX4GHz.tempoSliderMSB = function(channel, control, value, status, group) {
    PioneerDDJFLX4GHz.highResMSB[group].tempoSlider = value;
};

PioneerDDJFLX4GHz.tempoSliderLSB = function(channel, control, value, status, group) {
    const fullValue = (PioneerDDJFLX4GHz.highResMSB[group].tempoSlider << 7) + value;

    engine.setValue(
        group,
        "rate",
        1 - (fullValue / 0x2000)
    );
};

//
// Beat Jump mode
//
// Note that when we increase/decrease the sizes on the pad buttons, we use the
// value of the first pad (0x21) as an upper/lower limit beyond which we don't
// allow further increasing/decreasing of all the values.
//

PioneerDDJFLX4GHz.beatjumpPadPressed = function(_channel, control, value, _status, group) {
    if (value === 0) {
        return;
    }
    engine.setValue(group, "beatjump_size", Math.abs(PioneerDDJFLX4GHz.beatjumpSizeForPad[control]));
    engine.setValue(group, "beatjump", PioneerDDJFLX4GHz.beatjumpSizeForPad[control]);
};

PioneerDDJFLX4GHz.increaseBeatjumpSizes = function(_channel, control, value, _status, group) {
    if (value === 0 || PioneerDDJFLX4GHz.beatjumpSizeForPad[0x21] * 16 > 16) {
        return;
    }
    Object.keys(PioneerDDJFLX4GHz.beatjumpSizeForPad).forEach(function(pad) {
        PioneerDDJFLX4GHz.beatjumpSizeForPad[pad] = PioneerDDJFLX4GHz.beatjumpSizeForPad[pad] * 16;
    });
    engine.setValue(group, "beatjump_size", PioneerDDJFLX4GHz.beatjumpSizeForPad[0x21]);
};

PioneerDDJFLX4GHz.decreaseBeatjumpSizes = function(_channel, control, value, _status, group) {
    if (value === 0 || PioneerDDJFLX4GHz.beatjumpSizeForPad[0x21] / 16 < 1/16) {
        return;
    }
    Object.keys(PioneerDDJFLX4GHz.beatjumpSizeForPad).forEach(function(pad) {
        PioneerDDJFLX4GHz.beatjumpSizeForPad[pad] = PioneerDDJFLX4GHz.beatjumpSizeForPad[pad] / 16;
    });
    engine.setValue(group, "beatjump_size", PioneerDDJFLX4GHz.beatjumpSizeForPad[0x21]);
};

//
// Sampler mode
//

PioneerDDJFLX4GHz.samplerPlayOutputCallbackFunction = function(value, group, _control) {
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

        PioneerDDJFLX4GHz.startSamplerBlink(
            0x97 + deckIndex,
            0x30 + padIndex,
            group);
    }
};

PioneerDDJFLX4GHz.padModeKeyPressed = function(_channel, _control, value, _status, _group) {
    const deck = (_status === 0x90 ? PioneerDDJFLX4GHz.lights.deck1 : PioneerDDJFLX4GHz.lights.deck2);
    const group = _status === 0x90 ? "[Channel1]" : "[Channel2]";

    if (_control === 0x1B) {
        PioneerDDJFLX4GHz.toggleLight(deck.hotcueMode, true);
    } else if (_control === 0x69) {
        PioneerDDJFLX4GHz.toggleLight(deck.keyboardMode, true);
        PioneerDDJFLX4GHz.refreshStemPads(group);
    } else if (_control === 0x1E) {
        PioneerDDJFLX4GHz.toggleLight(deck.padFX1Mode, true);
    } else if (_control === 0x6B) {
        PioneerDDJFLX4GHz.toggleLight(deck.padFX2Mode, true);
    } else if (_control === 0x20) {
        PioneerDDJFLX4GHz.toggleLight(deck.beatJumpMode, true);
    } else if (_control === 0x6D) {
        PioneerDDJFLX4GHz.toggleLight(deck.beatLoopMode, true);
    } else if (_control === 0x22) {
        PioneerDDJFLX4GHz.toggleLight(deck.samplerMode, true);
    } else if (_control === 0x6F) {
        PioneerDDJFLX4GHz.toggleLight(deck.keyShiftMode, true);
    }
};

PioneerDDJFLX4GHz.samplerPadPressed = function(_channel, _control, value, _status, group) {
    if (engine.getValue(group, "track_loaded")) {
        engine.setValue(group, "cue_gotoandplay", value);
    } else {
        engine.setValue(group, "LoadSelectedTrack", value);
    }
};

PioneerDDJFLX4GHz.samplerPadShiftPressed = function(_channel, _control, value, _status, group) {
    if (engine.getValue(group, "play")) {
        engine.setValue(group, "cue_gotoandstop", value);
    } else if (engine.getValue(group, "track_loaded")) {
        engine.setValue(group, "eject", value);
    }
};

PioneerDDJFLX4GHz.startSamplerBlink = function(channel, control, group) {
    let val = 0x7f;

    PioneerDDJFLX4GHz.stopSamplerBlink(channel, control);
    PioneerDDJFLX4GHz.timers[channel][control] = engine.beginTimer(250, () => {
        val = 0x7f - val;

        // blink the appropriate pad
        midi.sendShortMsg(channel, control, val);
        // also blink the pad while SHIFT is pressed
        midi.sendShortMsg((channel+1), control, val);

        const isPlaying = engine.getValue(group, "play") === 1;

        if (!isPlaying) {
            // kill timer
            PioneerDDJFLX4GHz.stopSamplerBlink(channel, control);
            // set the pad LED to ON
            midi.sendShortMsg(channel, control, 0x7f);
            // set the pad LED to ON while SHIFT is pressed
            midi.sendShortMsg((channel+1), control, 0x7f);
        }
    });
};

PioneerDDJFLX4GHz.stopSamplerBlink = function(channel, control) {
    PioneerDDJFLX4GHz.timers[channel] = PioneerDDJFLX4GHz.timers[channel] || {};

    if (PioneerDDJFLX4GHz.timers[channel][control] !== undefined) {
        engine.stopTimer(PioneerDDJFLX4GHz.timers[channel][control]);
        PioneerDDJFLX4GHz.timers[channel][control] = undefined;
    }
};


PioneerDDJFLX4GHz.toggleQuantize = function(_channel, _control, value, _status, group) {
    if (value) {
        script.toggleControl(group, "quantize");
    }
};

PioneerDDJFLX4GHz.quickJumpForward = function(_channel, _control, value, _status, group) {
    if (value) {
        engine.setValue(group, "beatjump", PioneerDDJFLX4GHz.quickJumpSize);
    }
};

PioneerDDJFLX4GHz.quickJumpBack = function(_channel, _control, value, _status, group) {
    if (value) {
        engine.setValue(group, "beatjump", -PioneerDDJFLX4GHz.quickJumpSize);
    }
};

//
// Stems mode
//

PioneerDDJFLX4GHz.stemMutePadPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f || !PioneerDDJFLX4GHz.stemPadState[group].loaded) {
        return;
    }

    const stem = control - PioneerDDJFLX4GHz.stemMutePadsFirstControl + 1;
    if (stem < 1 || stem > 4) {
        return;
    }

    const stemGroup = PioneerDDJFLX4GHz.getStemGroup(group, stem);
    const nextValue = !PioneerDDJFLX4GHz.stemPadState[group].mute[stem - 1];

    PioneerDDJFLX4GHz.stemPadState[group].mute[stem - 1] = nextValue;
    engine.setValue(stemGroup, "mute", nextValue ? 1 : 0);
    PioneerDDJFLX4GHz.stemMuteChanged(nextValue ? 1 : 0, stemGroup);
};

PioneerDDJFLX4GHz.stemMutePadShiftPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f || !PioneerDDJFLX4GHz.stemPadState[group].loaded) {
        return;
    }

    const selectedStem = control - PioneerDDJFLX4GHz.stemMutePadsFirstControl + 1;
    if (selectedStem < 1 || selectedStem > 4) {
        return;
    }

    for (let stemIdx = 1; stemIdx <= 4; stemIdx++) {
        const stemGroup = PioneerDDJFLX4GHz.getStemGroup(group, stemIdx);
        const muted = stemIdx !== selectedStem;

        PioneerDDJFLX4GHz.stemPadState[group].mute[stemIdx - 1] = muted;
        engine.setValue(stemGroup, "mute", muted ? 1 : 0);
        PioneerDDJFLX4GHz.stemMuteChanged(muted ? 1 : 0, stemGroup);
    }
};

PioneerDDJFLX4GHz.stemFxPadPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f || !PioneerDDJFLX4GHz.stemPadState[group].loaded) {
        return;
    }

    const stem = control - PioneerDDJFLX4GHz.stemFxPadsFirstControl + 1;
    if (stem < 1 || stem > 4) {
        return;
    }

    const stemGroup = PioneerDDJFLX4GHz.getStemFxGroup(group, stem);
    const nextValue = !PioneerDDJFLX4GHz.stemPadState[group].fx[stem - 1];

    PioneerDDJFLX4GHz.stemPadState[group].fx[stem - 1] = nextValue;
    engine.setValue(stemGroup, "enabled", nextValue ? 1 : 0);
    PioneerDDJFLX4GHz.stemFxChanged(nextValue ? 1 : 0, stemGroup);
};

PioneerDDJFLX4GHz.stemFxPadShiftPressed = function(_channel, control, value, _status, group) {
    if (value !== 0x7f || !PioneerDDJFLX4GHz.stemPadState[group].loaded) {
        return;
    }

    const stem = control - PioneerDDJFLX4GHz.stemFxPadsFirstControl + 1;
    if (stem < 1 || stem > 4) {
        return;
    }

    const stemGroup = PioneerDDJFLX4GHz.getStemFxGroup(group, stem);

    engine.setValue(stemGroup, "next_chain_preset", 1);
};

PioneerDDJFLX4GHz.getStemGroup = function(group, stem) {
    return `[${group.substring(1, group.length - 1)}_Stem${stem}]`;
};

PioneerDDJFLX4GHz.getStemFxGroup = function(group, stem) {
    return `[QuickEffectRack1_[${group.substring(1, group.length - 1)}_Stem${stem}]]`;
};

PioneerDDJFLX4GHz.refreshStemPads = function(group) {
    for (let stem = 1; stem <= 4; stem++) {
        PioneerDDJFLX4GHz.stemMuteChanged(
            PioneerDDJFLX4GHz.stemPadState[group].mute[stem - 1] ? 1 : 0,
            PioneerDDJFLX4GHz.getStemGroup(group, stem),
        );
        PioneerDDJFLX4GHz.stemFxChanged(
            PioneerDDJFLX4GHz.stemPadState[group].fx[stem - 1] ? 1 : 0,
            PioneerDDJFLX4GHz.getStemFxGroup(group, stem),
        );
    }
};

PioneerDDJFLX4GHz.stemStateReset = function(_value, group, _control) {
    PioneerDDJFLX4GHz.stemPadState[group].loaded = _value > 0;
    PioneerDDJFLX4GHz.stemPadState[group].mute = [false, false, false, false];
    PioneerDDJFLX4GHz.stemPadState[group].fx = [false, false, false, false];
    PioneerDDJFLX4GHz.refreshStemPads(group);
};

PioneerDDJFLX4GHz.stemMuteChanged = function(value, group, _control) {
    const channelStem = group.match(/\[Channel(\d+)_Stem(\d+)\]/);
    if (!channelStem) {
        return;
    }
    const deck = Number(channelStem[1]);
    const stem = Number(channelStem[2]);
    const channel = `[Channel${deck}]`;

    let code = 0x00;
    if (PioneerDDJFLX4GHz.stemPadState[channel].loaded && stem <= 4 && value <= 0.5) {
        code = 0x7f;
    }

    for (let i=0; i<PioneerDDJFLX4GHz.stemsPadsModesStatus[channel].length; i++) {
        midi.sendShortMsg(
            PioneerDDJFLX4GHz.stemsPadsModesStatus[channel][i],
            PioneerDDJFLX4GHz.stemMutePadsFirstControl + stem -1,
            code,
        );
    }
};

PioneerDDJFLX4GHz.stemFxChanged = function(value, group, _control) {
    const channelStem = group.match(/\[QuickEffectRack1_\[Channel(\d+)_Stem(\d+)\]\]/);
    if (!channelStem) {
        return;
    }
    const deck = Number(channelStem[1]);
    const stem = Number(channelStem[2]);
    const channel = `[Channel${deck}]`;
    const code = PioneerDDJFLX4GHz.stemPadState[channel].loaded && value > 0.5 ? 0x7f : 0x00;

    for (let i=0; i<PioneerDDJFLX4GHz.stemsPadsModesStatus[channel].length; i++) {
        midi.sendShortMsg(
            PioneerDDJFLX4GHz.stemsPadsModesStatus[channel][i],
            PioneerDDJFLX4GHz.stemFxPadsFirstControl + stem -1,
            code,
        );
    }
};

//
// Pitch Shift mode
//

PioneerDDJFLX4GHz.pitchAdjusted = function(_value, group, _control) {
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

        PioneerDDJFLX4GHz.pitchPadsModesStatus[group].forEach(
            (padMode) => midi.sendShortMsg(
                padMode,
                PioneerDDJFLX4GHz.pitchPadsFirstControl + i,
                code,
            )
        );
    }
};

PioneerDDJFLX4GHz.pitchPadPressed = function(_channel, control, value, _status, group) {
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

PioneerDDJFLX4GHz.pitchPadShiftPressed = function(_channel, control, value, _status, group) {
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

PioneerDDJFLX4GHz.shutdown = function() {
    // reset vumeter
    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.deck1.vuMeter, false);
    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.deck2.vuMeter, false);

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

    // turn off loop in and out lights
    PioneerDDJFLX4GHz.setLoopButtonLights(0x90, 0x00);
    PioneerDDJFLX4GHz.setLoopButtonLights(0x91, 0x00);

    // turn off reloop lights
    PioneerDDJFLX4GHz.setReloopLight(0x90, 0x00);
    PioneerDDJFLX4GHz.setReloopLight(0x91, 0x00);

    // stop any flashing lights
    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.beatFx, false);
    PioneerDDJFLX4GHz.toggleLight(PioneerDDJFLX4GHz.lights.shiftBeatFx, false);

    // stop the keepalive timer
    engine.stopTimer(PioneerDDJFLX4GHz.keepAliveTimer);
};
