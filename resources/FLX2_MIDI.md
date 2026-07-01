# DDJ-FLX2 MIDI Summary

Source PDF: `resources/DDJ-FLX2_MIDI_Message_List_E1.pdf`

## Mixxx Mapping Overview

This mapping keeps the normal FLX2 deck, mixer, pad, and CFX layout where it
fits Mixxx, but several controls are repurposed because the FLX2 has fewer
dedicated hardware controls than larger Pioneer/AlphaTheta controllers.

### Library Mode

The FLX2 has no dedicated browse encoder or load buttons. This mapping uses a
temporary Library Mode instead:

- `Shift + Smart Fader`: enter Library Mode, show the maximized library, and
  flash the Smart Fader LED.
- `Smart Fader` while in Library Mode: exit Library Mode and hide the maximized
  library.
- `Shift + Smart Fader` while in Library Mode: also exits Library Mode.
- Jog wheel side rotation: scroll the focused library widget at reduced
  sensitivity.
- Jog platter rotation and touch: ignored in Library Mode, so it cannot scratch
  or pitch-bend while browsing.
- `Headphone Cue CH 1`: Back, matching shifted browse-encoder press behavior.
- `Headphone Cue CH 2`: Open/Enter, matching normal browse-encoder press
  behavior.
- `Shift + Headphone Cue CH 1`: load selected track to deck 1 and exit Library
  Mode.
- `Shift + Headphone Cue CH 2`: load selected track to deck 2 and exit Library
  Mode.
- `Play/Pause`: ignored in Library Mode to avoid accidental transport changes.

### Mixer And CFX Differences

- The FLX2 has no dedicated Trim knobs. `Shift + EQ Hi` controls channel Trim
  (`pregain`). Without Shift, the same knob controls High EQ.
- `EQ Hi` and `Shift + EQ Hi` use soft takeover. Because the same physical knob
  controls High EQ and Trim, each deck resets pickup for the target being left
  when the knob is moved after switching shifted/unshifted mode. This can be
  disabled with the `Soft takeover for EQ Hi / Trim` controller setting.
- CFX knobs control Mixxx QuickEffect `super1` for each deck.
- `Shift + Headphone Cue Master` is mapped as a Smart CFX approximation:
  pressing it toggles both deck QuickEffect presets between `Moog Filter` and
  `Filter Echo`.
- Smart CFX LED off means `Moog Filter`; Smart CFX LED on means `Filter Echo`.
  This depends on the current `~/.mixxx/effects.xml` QuickEffect preset order:
  `Filter Echo` is slot 2 and `Moog Filter` is slot 14.
- Master Level, Headphones Level, Headphones Mixing, and Headphone Cue Master
  are not mapped to Mixxx mixer controls. They also affect the FLX2 audio
  interface/firmware path directly, so mapping them in Mixxx would double-control
  audio.

### Pad And Utility Shortcuts

- Pad mode selection on the FLX2 is done with `Shift + Beat Sync`, then the pad
  selector buttons. Unlike the FLX4, the FLX2 does not have dedicated pad mode
  buttons.
- Beat Jump mode is available as a normal pad mode.
- `Shift + Beat Loop` pads are Beat Jump shortcuts:

| Pad | Action |
| --- | --- |
| P1 | Jump 1 beat backward |
| P2 | Jump 1 beat forward |
| P3 | Jump 4 beats backward |
| P4 | Jump 4 beats forward |
| P5 | Jump 8 beats backward |
| P6 | Jump 8 beats forward |
| P7 | Jump 16 beats backward |
| P8 | Jump 16 beats forward |

- Outside Library Mode, `Shift + Headphone Cue CH` toggles quantize for that
  deck.
- The quantize LED state is updated from script. The mapping sends both the
  PDF-listed shifted cue output note (`9n 39`) and the hardware-observed shifted
  input note (`90 08` / `91 07`) because XML output alone did not show the state
  on the FLX2.
- Dedicated loop in/out, loop adjust, loop active/reloop, memory cue, VU meter,
  and mic-level controls are not mapped because those controls are not present
  on the FLX2 hardware.

## MIDI Reference

This is a condensed reference for the AlphaTheta/Pioneer DDJ-FLX2 MIDI message
list. The PDF uses placeholder status bytes:

- `9n` / `Bn`: deck note / CC status, where deck 1 uses `n=0`
  (`0x90` / `0xB0`) and deck 2 uses `n=1` (`0x91` / `0xB1`).
- `96` / `B6`: global section note / CC status, MIDI channel 7.
- `9p`: pad note status, where deck 1 unshifted uses `p=7` (`0x97`),
  deck 1 shifted uses `p=8` (`0x98`), deck 2 unshifted uses `p=9`
  (`0x99`), and deck 2 shifted uses `p=A` (`0x9A`).
- `9F`: MIDI-out communication channel 16.
- `hh`: variable data value. Buttons use `0x00` for off/release and `0x7F`
  for on/press unless noted.

## MIDI Channels

| MIDI channel | Hex suffix | Use |
| --- | --- | --- |
| 1 | `n=0` | Deck 1, except performance pads |
| 2 | `n=1` | Deck 2, except performance pads |
| 7 | `m=6` | Global section |
| 8 | `p=7` | Deck 1 performance pads, no Shift |
| 9 | `p=8` | Deck 1 performance pads, with Shift |
| 10 | `p=9` | Deck 2 performance pads, no Shift |
| 11 | `p=A` | Deck 2 performance pads, with Shift |
| 16 | `m=F` | MIDI-out communication |

Channels 3-6 and 12-15 are unused in the PDF.

## Value Conventions

- Button and touch notes are normally `0x00` off and `0x7F` on.
- Relative jog rotation sends the difference count from the previous operation.
  Clockwise values increase from `0x41`; counterclockwise values decrease from
  `0x3F`.
- 14-bit absolute controls use an MSB CC and an LSB CC. Minimum is
  `MSB=0x00, LSB=0x00`; maximum is `MSB=0x7F, LSB=0x7F`.

## Deck Controls

Right-deck MIDI data is the same as left-deck data except for the deck channel
suffix (`n=1` instead of `n=0`).

| Fig | Control | Action / condition | MIDI input | MIDI output | Notes |
| --- | --- | --- | --- | --- | --- |
| D1 | Jog platter | Rotate, vinyl on | `Bn 22 hh` | none | Relative |
| D1 | Jog platter | Rotate, vinyl off | `Bn 23 hh` | none | Relative |
| D1 | Jog platter + Shift | Rotate | `Bn 29 hh` | none | Relative |
| D1 | Jog platter | Touch | `9n 36 hh` | none | Off/on |
| D1 | Jog platter + Shift | Touch | `9n 67 hh` | none | Off/on |
| D1 | Jog wheel side | Rotate | `Bn 21 hh` | none | Relative |
| D1 | Jog wheel side + Shift | Rotate | `Bn 21 hh` | none | Relative |
| D2 | Beat Sync | Short press | `9n 58 hh` | `9n 58 hh` | Hardware-verified input; off/on |
| D2 | Beat Sync | Long press | `9n 5C hh` | `9n 78 hh` | Hardware-verified input; output from PDF |
| D2 | Beat Sync + Shift | Press | `9n 2A hh` | none | Hardware-verified input on both decks; Shift also sends `9n 3F hh` |
| D3 | Tempo | Slide | `Bn 00 MSB`, `Bn 20 LSB` | none | 14-bit; minus side to plus side |
| D3 | Tempo + Shift | Slide | `Bn 00 MSB`, `Bn 20 LSB` | none | Same CC pair as unshifted |
| D4 | Play/Pause | Press | `9n 0B hh` | `9n 0B hh` | Off/on |
| D4 | Play/Pause + Shift | Press | `9n 47 hh` | `9n 47 hh` | Off/on |
| D5 | Cue | Press | `9n 0C hh` | `9n 0C hh` | Off/on |
| D5 | Cue + Shift | Press | `9n 48 hh` | `9n 48 hh` | Off/on |
| D6 | Shift | Press | `9n 3F hh` | none | Off/on |

## Effect Control

| Fig | Control | Action | MIDI input | MIDI output | Notes |
| --- | --- | --- | --- | --- | --- |
| F1 | Smart Fader | Press | `96 01 hh` | `96 01 hh` | Off/on |
| F1 | Smart Fader + Shift | Press | `96 09 hh` | `96 09 hh` | Off/on |

## Mixer Controls

| Fig | Control | Action | MIDI input | MIDI output | Notes |
| --- | --- | --- | --- | --- | --- |
| M1 | EQ Hi | Rotate | `Bn 07 MSB`, `Bn 27 LSB` | none | Per-deck 14-bit |
| M2 | EQ Mid | Rotate | `Bn 0B MSB`, `Bn 2B LSB` | none | Per-deck 14-bit |
| M3 | EQ Low | Rotate | `Bn 0F MSB`, `Bn 2F LSB` | none | Per-deck 14-bit |
| M4 | CFX CH 1 | Rotate | `B6 17 MSB`, `B6 37 LSB` | none | Global 14-bit |
| M4 | CFX CH 2 | Rotate | `B6 18 MSB`, `B6 38 LSB` | none | Global 14-bit |
| M5 | Headphone Cue Master | Press | `96 63 hh` | `96 63 hh` | Off/on |
| M5 | Headphone Cue Master + Shift | Press | `96 00 hh` | `96 00 hh` | Off/on |
| M6 | Headphone Cue CH | Press | `9n 54 hh` | `9n 54 hh` | Per-deck off/on |
| M6 | Headphone Cue CH + Shift | Press, deck 1 | `90 08 hh` | `90 39 hh` | Hardware-verified input; output from PDF |
| M6 | Headphone Cue CH + Shift | Press, deck 2 | `91 07 hh` | `91 39 hh` | Hardware-verified input; output inferred from PDF pattern |
| M7 | Channel Fader | Slide | `Bn 13 MSB`, `Bn 33 LSB` | none | Bottom to top 14-bit |
| M7 | Channel Fader | Bottom to not-bottom | `9n 66 hh` | none | PLAY fader-start message |
| M7 | Channel Fader + Shift | Bottom to not-bottom | `9n 66 hh` | none | Hardware-verified on both decks; same note as unshifted fader start |
| M7 | Channel Fader + Shift | Not-bottom to bottom | `9n 52 hh` | none | Hardware-verified on both decks; no event at top |
| M7 | Channel Fader + Shift | PDF-listed bottom to not-bottom | `9n 5D hh` | none | PDF lists SYNC fader-start; not yet observed in hardware capture |
| M8 | Crossfader | Slide | `B6 1F MSB`, `B6 3F LSB` | none | Left to right 14-bit |
| M8 | Crossfader | Deck 1, right side to other | `90 66 hh` | none | PLAY fader-start message |
| M8 | Crossfader | Deck 1, right side to other | `90 5D hh` | none | SYNC fader-start message |
| M8 | Crossfader | Deck 1, other to right side | `90 52 hh` | none | Hardware-verified with Shift at right side; PDF lists PLAY fader-start |
| M8 | Crossfader | Deck 2, left side to other | `91 66 hh` | none | SYNC fader-start message |
| M8 | Crossfader | Deck 2, left side to other | `91 5D hh` | none | CUE fader-start message |
| M8 | Crossfader | Deck 2, other to left side | `91 52 hh` | none | Hardware-verified with Shift at left side; PDF lists CUE fader-start |
| M9 | Master Level | Rotate | `B6 08 MSB`, `B6 28 LSB` | none | Global 14-bit |
| M10 | Headphones Level | Rotate | `B6 0D MSB`, `B6 2D LSB` | none | Global 14-bit |

## Performance Pads

Pad presses are notes on the pad channels. Each listed note also has a matching
MIDI output entry for LED feedback: `9p <note> hh`.

| Pad | Mode 1 note | Mode 2 note | Mode 3 note | Mode 4 note |
| --- | --- | --- | --- | --- |
| P1 | `0x00` | `0x10` | `0x60` | `0x30` |
| P2 | `0x01` | `0x11` | `0x61` | `0x31` |
| P3 | `0x02` | `0x12` | `0x62` | `0x32` |
| P4 | `0x03` | `0x13` | `0x63` | `0x33` |
| P5 | `0x04` | `0x14` | `0x64` | `0x34` |
| P6 | `0x05` | `0x15` | `0x65` | `0x35` |
| P7 | `0x06` | `0x16` | `0x66` | `0x36` |
| P8 | `0x07` | `0x17` | `0x67` | `0x37` |

The same note numbers are used on shifted pad channels:

- Deck 1 no Shift: status `0x97`
- Deck 1 with Shift: status `0x98`
- Deck 2 no Shift: status `0x99`
- Deck 2 with Shift: status `0x9A`

### Pad Mode Select

The PDF footnote says pad mode selection is enabled by pressing Beat Sync while
holding Shift. Hardware verification with `aseqdump` confirms these selectors
use deck note status `9n`, not pad status `9p`.

| Selector pad | Note | Scale | Deck 1 press | Deck 2 press |
| --- | --- | --- | --- | --- |
| P1 | `0x00` | C-1 | `90 00 7F` | `91 00 7F` |
| P2 | `0x05` | F-1 | `90 05 7F` | `91 05 7F` |
| P3 | `0x01` | C#-1 | `90 01 7F` | `91 01 7F` |
| P4 | `0x03` | D#-1 | `90 03 7F` | `91 03 7F` |

`aseqdump` reports these as channel `0` for deck 1 and channel `1` for deck 2
because it displays MIDI channels zero-based. Release messages use the same
status and note with `0x00` velocity.

## MIDI-Out Only / Settings

| Group | Function | MIDI output | Notes |
| --- | --- | --- | --- |
| Illumination Control | Loaded, deck 1 | `9F 00 7F` | Track load illumination |
| Illumination Control | Loaded, deck 2 | `9F 01 7F` | Track load illumination |
| Setting | Vinyl mode on/off | `9n 17 hh` | Off/on, default on |

Vinyl mode cannot be changed from the unit according to the PDF. It must be
changed by sending MIDI output from the DJ application.
