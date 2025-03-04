import { hasOwnProperty } from './has-own-property';
import type { StringOrValue } from './string-or-value';

const breakpoints = ['initial', 'xs', 'sm', 'md', 'lg', 'xl'] as const;
type Breakpoints = (typeof breakpoints)[number];
type Responsive<T> = T | Partial<Record<Breakpoints, T>>;

interface GetResponsiveStylesOptions {
  className: string;
  customProperties: `--${string}`[];
  value: Responsive<StringOrValue<string>> | Responsive<string> | undefined;
  propValues: string[] | readonly string[];
  parseValue?: (value: string) => string | undefined;
}

function getResponsiveStyles({ className, customProperties, ...args }: GetResponsiveStylesOptions) {
  const responsiveClassNames = getResponsiveClassNames({
    allowArbitraryValues: true,
    className,
    ...args,
  });

  const responsiveCustomProperties = getResponsiveCustomProperties({ customProperties, ...args });
  return [responsiveClassNames, responsiveCustomProperties] as const;
}

interface GetResponsiveClassNamesOptions {
  allowArbitraryValues?: boolean;
  className: string;
  value: Responsive<StringOrValue<string>> | Responsive<string> | undefined;
  propValues: string[] | readonly string[];
  parseValue?: (value: string) => string | undefined;
}

function getResponsiveClassNames({
  allowArbitraryValues,
  value,
  className,
  propValues,
  parseValue = (value) => value,
}: GetResponsiveClassNamesOptions): string | undefined {
  const classNames: string[] = [];

  if (!value) {
    return undefined;
  }

  if (typeof value === 'string' && propValues.includes(value)) {
    return getBaseClassName(className, value, parseValue);
  }

  if (isResponsiveObject(value)) {
    const object = value;

    for (const bp in object) {
      // Make sure we are not iterating over keys that aren't breakpoints
      if (!hasOwnProperty(object, bp) || !breakpoints.includes(bp)) {
        continue;
      }

      const value = object[bp];

      if (value !== undefined) {
        if (propValues.includes(value)) {
          const baseClassName = getBaseClassName(className, value, parseValue);
          const bpClassName = bp === 'initial' ? baseClassName : `${bp}:${baseClassName}`;
          classNames.push(bpClassName);
        } else if (allowArbitraryValues) {
          const bpClassName = bp === 'initial' ? className : `${bp}:${className}`;
          classNames.push(bpClassName);
        }
      }
    }

    return classNames.join(' ');
  }

  if (allowArbitraryValues) {
    return className;
  }
}

function getBaseClassName(
  className: string,
  value: string,
  parseValue: (value: string) => string | undefined
): string {
  const delimiter = className ? '-' : '';
  const matchedValue = parseValue(value);
  const isNegative = matchedValue?.startsWith('-');
  const minus = isNegative ? '-' : '';
  const absoluteValue = isNegative ? matchedValue?.substring(1) : matchedValue;
  return `${minus}${className}${delimiter}${absoluteValue}`;
}

interface GetResponsiveCustomPropertiesOptions {
  customProperties: `--${string}`[];
  value: Responsive<StringOrValue<string>> | Responsive<string> | undefined;
  propValues: string[] | readonly string[];
  parseValue?: (value: string) => string | undefined;
}

function getResponsiveCustomProperties({
  customProperties,
  value,
  propValues,
  parseValue = (value) => value,
}: GetResponsiveCustomPropertiesOptions) {
  let styles: Record<string, string | undefined> = {};

  // Don't generate custom properties if the value is not arbitrary
  if (!value || (typeof value === 'string' && propValues.includes(value))) {
    return undefined;
  }

  if (typeof value === 'string') {
    styles = Object.fromEntries(customProperties.map((prop) => [prop, value]));
  }

  if (isResponsiveObject(value)) {
    const object = value;

    for (const bp in object) {
      // Make sure we are not iterating over keys that aren't breakpoints
      if (!hasOwnProperty(object, bp) || !breakpoints.includes(bp)) {
        continue;
      }

      const value = object[bp];

      // Don't generate a custom property if the value is not arbitrary
      if (propValues.includes(value)) {
        continue;
      }

      for (const customProperty of customProperties) {
        const bpProperty = bp === 'initial' ? customProperty : `${customProperty}-${bp}`;

        styles = {
          [bpProperty]: value,
          ...styles,
        };
      }
    }
  }

  for (const key in styles) {
    const value = styles[key];
    if (value !== undefined) {
      styles[key] = parseValue(value);
    }
  }

  return styles;
}

// Split comma-separated custom properties. This is an escape hatch for
// when you need to generate multiple custom properties with the same value.
function getCustomProperties(str: `--${string}`) {
  return str.split(',').map((str) => str.trim());
}

function isResponsiveObject<Value extends string>(
  obj: Responsive<Value | Omit<string, Value>> | undefined
): obj is Record<Breakpoints, string> {
  return (
    typeof obj === 'object' &&
    Object.keys(obj).some((key) => (breakpoints as readonly string[]).includes(key))
  );
}

export {
  getResponsiveStyles,
  getResponsiveCustomProperties,
  getResponsiveClassNames,
  isResponsiveObject,
};

export type { Breakpoints, Responsive, StringOrValue };
