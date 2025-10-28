

export type EnumKeys<T> = keyof T extends string ? keyof T : never;

export type EnumValues<T> = T[keyof T];