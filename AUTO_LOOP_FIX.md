# AUTO LOOP double-step fix (FLX4)

## Bug

When a loop was active, one press of CUE/LOOP CALL RIGHT (double) could resize it twice: for example, an actual 4-beat loop became 16 beats even though the interface appeared to advance only one step to 8. The inverse could happen with CUE/LOOP CALL LEFT (halve).

## Root cause

`PioneerDDJFLX4GHz.adjustBeatloopSize(group, factor)` wrote to two Mixxx controls in one press:

```javascript
const currentSize = engine.getValue(group, "beatloop_size");
if (currentSize > 0) {
    engine.setValue(group, "beatloop_size", currentSize * factor);
}
if (engine.getValue(group, "loop_enabled")) {
    engine.setValue(group, "loop_scale", factor);
}
```

The `beatloop_size` update and `loop_scale` command both requested a loop-size change while a loop was active.

## Correction

The two paths are now mutually exclusive:

```javascript
PioneerDDJFLX4GHz.adjustBeatloopSize = function(group, factor) {
    if (engine.getValue(group, "loop_enabled")) {
        // Resize the active loop once. Do not also change beatloop_size.
        engine.setValue(group, "loop_scale", factor);
    } else {
        // With no active loop, adjust the size used for the next beatloop.
        const currentSize = engine.getValue(group, "beatloop_size");
        if (currentSize > 0) {
            engine.setValue(group, "beatloop_size", currentSize * factor);
        }
    }
};
```

For an active loop, only `loop_scale` receives the factor (2.0 for double, 0.5 for halve). For an inactive loop, only the next-loop size setting is updated.

## Regression checks

1. Start a 4-beat loop on deck 1; press double once and confirm an actual 8-beat loop, then 16 beats on the next press.
2. Halve twice and confirm 16 -> 8 -> 4.
3. Confirm the on-screen value matches the actual audible loop length.
4. Repeat on deck 2.
5. Verify inactive-loop size selection, AUTO LOOP activation and exit still work.

**Status:** This is a targeted source fix matching the previously diagnosed issue. The change committed in this fork has not yet been tested on hardware/Mixxx; please verify before describing this particular commit as confirmed working.
