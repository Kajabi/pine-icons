# pds-icon



<!-- Auto Generated Below -->


## Properties

| Property  | Attribute  | Description                                                                                                                                                                                                                                                                                | Type      | Default     |
| --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ----------- |
| `color`   | `color`    |  The color of the icon                                                                                                                                                                                                                                                                     | `string`  | `undefined` |
| `flipRtl` | `flip-rtl` | Determines if the icon should be flipped when the `dir` is right-to-left (`"rtl"`). This is automatically enabled for icons that are in the `ICONS_TO_FLIP` list and when the `dir` is `"rtl"`. If `flipRtl` is set to `false`, the icon will not be flipped even if the `dir` is `"rtl"`. | `boolean` | `undefined` |
| `icon`    | `icon`     | This is a combination of both `name` and `src`. If a `src` URL is detected, it will set the `src` property. Otherwise it assumes it's a built-in named SVG and sets the `name` property.                                                                                                   | `any`     | `undefined` |
| `name`    | `name`     | The name of the icon to use from the built-in set.                                                                                                                                                                                                                                         | `string`  | `undefined` |
| `size`    | `size`     | The size of the icon. This can be 'small', 'regular', 'medium', 'large', or a custom value (40px, 1rem, etc)                                                                                                                                                                               | `string`  | `'regular'` |
| `src`     | `src`      |  Specifies the exact `src` of an SVG file to use.                                                                                                                                                                                                                                          | `string`  | `undefined` |


----------------------------------------------


