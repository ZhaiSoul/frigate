---
id: objects
title: Available Objects
---

import labels from "../../../labelmap.txt";

Frigate includes the object labels listed below from the Google Coral test data.

Please note:

- `car` is listed twice because `truck` has been renamed to `car` by default. These object types are frequently confused.
- `person` is the only tracked object by default. See the [full configuration reference](reference.md) for an example of expanding the list of tracked objects.

<ul>
  {labels.split("\n").map((label) => (
    <li>{label.replace(/^\d+\s+/, "")}</li>
  ))}
</ul>

## Custom Models

Models for both CPU and EdgeTPU (Coral) are bundled in the image. You can use your own models with volume mounts:

- CPU Model: `/cpu_model.tflite`
- EdgeTPU Model: `/edgetpu_model.tflite`
- Labels: `/labelmap.txt`

You also need to update the [model config](advanced.md#model) if they differ from the defaults.
