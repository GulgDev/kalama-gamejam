{{#sprites}}
// {{name}}
export const {{name}}Width = {{width}};
export const {{name}}Height = {{height}};
export const {{name}}Flags = {{flags}}; // {{flagsHumanReadable}}
export const {{name}} = memory.data<u8>([ {{bytes}} ]);

{{/sprites}}