const fs = require('node:fs');
const path = require('node:path');

// Swift 6.3 rejects conversion of a conditional expression to a C callback.
// Preserve the read-only nil setter, and convert each function directly.
const file = path.join(path.dirname(require.resolve('expo-modules-jsi/package.json')),
  'apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift');
const before = `    let callbacks = expo.HostObjectCallbacks(
      context, getter, set == nil ? nil : setter, propertyNamesGetter, deallocate)`;
const after = `    // prologue-swift-callback-compatibility
    let callbacks: expo.HostObjectCallbacks
    if set == nil {
      callbacks = expo.HostObjectCallbacks(context, getter, nil, propertyNamesGetter, deallocate)
    } else {
      callbacks = expo.HostObjectCallbacks(context, getter, setter, propertyNamesGetter, deallocate)
    }`;
const source = fs.readFileSync(file, 'utf8');
if (!source.includes('prologue-swift-callback-compatibility')) {
  if (!source.includes(before)) throw new Error('Expo JSI callback changed; review the compatibility patch');
  fs.writeFileSync(file, source.replace(before, after));
}
