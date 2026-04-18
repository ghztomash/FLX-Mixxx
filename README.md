# Pioneer DDJ-FLX Mixxx Mappings

Custom Mixxx controller mapping for the Pioneer/AlphaTheta DDJ-FLX series, based on
the DDJ-400 mapping work and adjusted to match the expected Recordbox user experience.

## Features

- Standard deck, mixer, jog wheel, performance pad, Beat FX, and CFX controls.
- Library Mode for browsing/loading without a dedicated browse encoder.
- `Shift + EQ Hi` controls channel trim because the FLX2 has no Trim knobs.
- `Shift + Beat Loop` pads provide Beat Jump shortcuts.
- `Shift + Headphone Cue CH` toggles quantize outside Library Mode and loads
  the selected track while in Library Mode.
- Smart CFX approximation toggles deck QuickEffect presets between `Moog Filter`
  and `Filter Echo`.

See `FLX2_MIDI.md` for the full custom behavior summary.

## Installation

Add these files into your Mixxx controllers directory:

```sh
git clone https://github.com/ghztomash/FLX-Mixxx.git ~/.mixxx/controllers
```

Then open Mixxx and select the DDJ-FLX* device in `Preferences` -> `Controllers`. Load the mapping named `Pioneer DDJ-FLX*-ghz`.

## FLX2

Library Mode was added for browsing/loading without a dedicated browse encoder.

- `Shift + Smart Fader`: enter Library Mode and show the maximized library.
- `Smart Fader`: exit Library Mode.
- Side jog wheels: scroll the library while Library Mode is active.
- `Headphone Cue CH 1`: Back.
- `Headphone Cue CH 2`: Open/Enter.
- `Shift + Headphone Cue CH 1/2`: load selected track to deck 1/2 and exit
  Library Mode.

## Contributors

- [Tomash GHz](https://github.com/ghztomash)

Based on the work of:

- Warker
- nschloe
- dj3730
- jusko
- Robert904
