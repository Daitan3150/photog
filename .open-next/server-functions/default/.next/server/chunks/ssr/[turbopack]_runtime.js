const RUNTIME_PUBLIC_PATH = "server/chunks/ssr/[turbopack]_runtime.js";
const RELATIVE_ROOT_PATH = "..";
const ASSET_PREFIX = "/_next/";
/**
 * This file contains runtime types and functions that are shared between all
 * TurboPack ECMAScript runtimes.
 *
 * It will be prepended to the runtime code of each runtime.
 */ /* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="./runtime-types.d.ts" />
const REEXPORTED_OBJECTS = new WeakMap();
/**
 * Constructs the `__turbopack_context__` object for a module.
 */ function Context(module, exports) {
    this.m = module;
    // We need to store this here instead of accessing it from the module object to:
    // 1. Make it available to factories directly, since we rewrite `this` to
    //    `__turbopack_context__.e` in CJS modules.
    // 2. Support async modules which rewrite `module.exports` to a promise, so we
    //    can still access the original exports object from functions like
    //    `esmExport`
    // Ideally we could find a new approach for async modules and drop this property altogether.
    this.e = exports;
}
const contextPrototype = Context.prototype;
const hasOwnProperty = Object.prototype.hasOwnProperty;
const toStringTag = typeof Symbol !== 'undefined' && Symbol.toStringTag;
function defineProp(obj, name, options) {
    if (!hasOwnProperty.call(obj, name)) Object.defineProperty(obj, name, options);
}
function getOverwrittenModule(moduleCache, id) {
    let module = moduleCache[id];
    if (!module) {
        // This is invoked when a module is merged into another module, thus it wasn't invoked via
        // instantiateModule and the cache entry wasn't created yet.
        module = createModuleObject(id);
        moduleCache[id] = module;
    }
    return module;
}
/**
 * Creates the module object. Only done here to ensure all module objects have the same shape.
 */ function createModuleObject(id) {
    return {
        exports: {},
        error: undefined,
        id,
        namespaceObject: undefined
    };
}
const BindingTag_Value = 0;
/**
 * Adds the getters to the exports object.
 */ function esm(exports, bindings) {
    defineProp(exports, '__esModule', {
        value: true
    });
    if (toStringTag) defineProp(exports, toStringTag, {
        value: 'Module'
    });
    let i = 0;
    while(i < bindings.length){
        const propName = bindings[i++];
        const tagOrFunction = bindings[i++];
        if (typeof tagOrFunction === 'number') {
            if (tagOrFunction === BindingTag_Value) {
                defineProp(exports, propName, {
                    value: bindings[i++],
                    enumerable: true,
                    writable: false
                });
            } else {
                throw new Error(`unexpected tag: ${tagOrFunction}`);
            }
        } else {
            const getterFn = tagOrFunction;
            if (typeof bindings[i] === 'function') {
                const setterFn = bindings[i++];
                defineProp(exports, propName, {
                    get: getterFn,
                    set: setterFn,
                    enumerable: true
                });
            } else {
                defineProp(exports, propName, {
                    get: getterFn,
                    enumerable: true
                });
            }
        }
    }
    Object.seal(exports);
}
/**
 * Makes the module an ESM with exports
 */ function esmExport(bindings, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    module.namespaceObject = exports;
    esm(exports, bindings);
}
contextPrototype.s = esmExport;
function ensureDynamicExports(module, exports) {
    let reexportedObjects = REEXPORTED_OBJECTS.get(module);
    if (!reexportedObjects) {
        REEXPORTED_OBJECTS.set(module, reexportedObjects = []);
        module.exports = module.namespaceObject = new Proxy(exports, {
            get (target, prop) {
                if (hasOwnProperty.call(target, prop) || prop === 'default' || prop === '__esModule') {
                    return Reflect.get(target, prop);
                }
                for (const obj of reexportedObjects){
                    const value = Reflect.get(obj, prop);
                    if (value !== undefined) return value;
                }
                return undefined;
            },
            ownKeys (target) {
                const keys = Reflect.ownKeys(target);
                for (const obj of reexportedObjects){
                    for (const key of Reflect.ownKeys(obj)){
                        if (key !== 'default' && !keys.includes(key)) keys.push(key);
                    }
                }
                return keys;
            }
        });
    }
    return reexportedObjects;
}
/**
 * Dynamically exports properties from an object
 */ function dynamicExport(object, id) {
    let module;
    let exports;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
        exports = module.exports;
    } else {
        module = this.m;
        exports = this.e;
    }
    const reexportedObjects = ensureDynamicExports(module, exports);
    if (typeof object === 'object' && object !== null) {
        reexportedObjects.push(object);
    }
}
contextPrototype.j = dynamicExport;
function exportValue(value, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = value;
}
contextPrototype.v = exportValue;
function exportNamespace(namespace, id) {
    let module;
    if (id != null) {
        module = getOverwrittenModule(this.c, id);
    } else {
        module = this.m;
    }
    module.exports = module.namespaceObject = namespace;
}
contextPrototype.n = exportNamespace;
function createGetter(obj, key) {
    return ()=>obj[key];
}
/**
 * @returns prototype of the object
 */ const getProto = Object.getPrototypeOf ? (obj)=>Object.getPrototypeOf(obj) : (obj)=>obj.__proto__;
/** Prototypes that are not expanded for exports */ const LEAF_PROTOTYPES = [
    null,
    getProto({}),
    getProto([]),
    getProto(getProto)
];
/**
 * @param raw
 * @param ns
 * @param allowExportDefault
 *   * `false`: will have the raw module as default export
 *   * `true`: will have the default property as default export
 */ function interopEsm(raw, ns, allowExportDefault) {
    const bindings = [];
    let defaultLocation = -1;
    for(let current = raw; (typeof current === 'object' || typeof current === 'function') && !LEAF_PROTOTYPES.includes(current); current = getProto(current)){
        for (const key of Object.getOwnPropertyNames(current)){
            bindings.push(key, createGetter(raw, key));
            if (defaultLocation === -1 && key === 'default') {
                defaultLocation = bindings.length - 1;
            }
        }
    }
    // this is not really correct
    // we should set the `default` getter if the imported module is a `.cjs file`
    if (!(allowExportDefault && defaultLocation >= 0)) {
        // Replace the binding with one for the namespace itself in order to preserve iteration order.
        if (defaultLocation >= 0) {
            // Replace the getter with the value
            bindings.splice(defaultLocation, 1, BindingTag_Value, raw);
        } else {
            bindings.push('default', BindingTag_Value, raw);
        }
    }
    esm(ns, bindings);
    return ns;
}
function createNS(raw) {
    if (typeof raw === 'function') {
        return function(...args) {
            return raw.apply(this, args);
        };
    } else {
        return Object.create(null);
    }
}
function esmImport(id) {
    const module = getOrInstantiateModuleFromParent(id, this.m);
    // any ES module has to have `module.namespaceObject` defined.
    if (module.namespaceObject) return module.namespaceObject;
    // only ESM can be an async module, so we don't need to worry about exports being a promise here.
    const raw = module.exports;
    return module.namespaceObject = interopEsm(raw, createNS(raw), raw && raw.__esModule);
}
contextPrototype.i = esmImport;
function asyncLoader(moduleId) {
    const loader = this.r(moduleId);
    return loader(esmImport.bind(this));
}
contextPrototype.A = asyncLoader;
// Add a simple runtime require so that environments without one can still pass
// `typeof require` CommonJS checks so that exports are correctly registered.
const runtimeRequire = // @ts-ignore
typeof require === 'function' ? require : function require1() {
    throw new Error('Unexpected use of runtime require');
};
contextPrototype.t = runtimeRequire;
function commonJsRequire(id) {
    return getOrInstantiateModuleFromParent(id, this.m).exports;
}
contextPrototype.r = commonJsRequire;
/**
 * Remove fragments and query parameters since they are never part of the context map keys
 *
 * This matches how we parse patterns at resolving time.  Arguably we should only do this for
 * strings passed to `import` but the resolve does it for `import` and `require` and so we do
 * here as well.
 */ function parseRequest(request) {
    // Per the URI spec fragments can contain `?` characters, so we should trim it off first
    // https://datatracker.ietf.org/doc/html/rfc3986#section-3.5
    const hashIndex = request.indexOf('#');
    if (hashIndex !== -1) {
        request = request.substring(0, hashIndex);
    }
    const queryIndex = request.indexOf('?');
    if (queryIndex !== -1) {
        request = request.substring(0, queryIndex);
    }
    return request;
}
/**
 * `require.context` and require/import expression runtime.
 */ function moduleContext(map) {
    function moduleContext(id) {
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].module();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    }
    moduleContext.keys = ()=>{
        return Object.keys(map);
    };
    moduleContext.resolve = (id)=>{
        id = parseRequest(id);
        if (hasOwnProperty.call(map, id)) {
            return map[id].id();
        }
        const e = new Error(`Cannot find module '${id}'`);
        e.code = 'MODULE_NOT_FOUND';
        throw e;
    };
    moduleContext.import = async (id)=>{
        return await moduleContext(id);
    };
    return moduleContext;
}
contextPrototype.f = moduleContext;
/**
 * Returns the path of a chunk defined by its data.
 */ function getChunkPath(chunkData) {
    return typeof chunkData === 'string' ? chunkData : chunkData.path;
}
function isPromise(maybePromise) {
    return maybePromise != null && typeof maybePromise === 'object' && 'then' in maybePromise && typeof maybePromise.then === 'function';
}
function isAsyncModuleExt(obj) {
    return turbopackQueues in obj;
}
function createPromise() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej)=>{
        reject = rej;
        resolve = res;
    });
    return {
        promise,
        resolve: resolve,
        reject: reject
    };
}
// Load the CompressedmoduleFactories of a chunk into the `moduleFactories` Map.
// The CompressedModuleFactories format is
// - 1 or more module ids
// - a module factory function
// So walking this is a little complex but the flat structure is also fast to
// traverse, we can use `typeof` operators to distinguish the two cases.
function installCompressedModuleFactories(chunkModules, offset, moduleFactories, newModuleId) {
    let i = offset;
    while(i < chunkModules.length){
        let moduleId = chunkModules[i];
        let end = i + 1;
        // Find our factory function
        while(end < chunkModules.length && typeof chunkModules[end] !== 'function'){
            end++;
        }
        if (end === chunkModules.length) {
            throw new Error('malformed chunk format, expected a factory function');
        }
        // Each chunk item has a 'primary id' and optional additional ids. If the primary id is already
        // present we know all the additional ids are also present, so we don't need to check.
        if (!moduleFactories.has(moduleId)) {
            const moduleFactoryFn = chunkModules[end];
            applyModuleFactoryName(moduleFactoryFn);
            newModuleId?.(moduleId);
            for(; i < end; i++){
                moduleId = chunkModules[i];
                moduleFactories.set(moduleId, moduleFactoryFn);
            }
        }
        i = end + 1; // end is pointing at the last factory advance to the next id or the end of the array.
    }
}
// everything below is adapted from webpack
// https://github.com/webpack/webpack/blob/6be4065ade1e252c1d8dcba4af0f43e32af1bdc1/lib/runtime/AsyncModuleRuntimeModule.js#L13
const turbopackQueues = Symbol('turbopack queues');
const turbopackExports = Symbol('turbopack exports');
const turbopackError = Symbol('turbopack error');
function resolveQueue(queue) {
    if (queue && queue.status !== 1) {
        queue.status = 1;
        queue.forEach((fn)=>fn.queueCount--);
        queue.forEach((fn)=>fn.queueCount-- ? fn.queueCount++ : fn());
    }
}
function wrapDeps(deps) {
    return deps.map((dep)=>{
        if (dep !== null && typeof dep === 'object') {
            if (isAsyncModuleExt(dep)) return dep;
            if (isPromise(dep)) {
                const queue = Object.assign([], {
                    status: 0
                });
                const obj = {
                    [turbopackExports]: {},
                    [turbopackQueues]: (fn)=>fn(queue)
                };
                dep.then((res)=>{
                    obj[turbopackExports] = res;
                    resolveQueue(queue);
                }, (err)=>{
                    obj[turbopackError] = err;
                    resolveQueue(queue);
                });
                return obj;
            }
        }
        return {
            [turbopackExports]: dep,
            [turbopackQueues]: ()=>{}
        };
    });
}
function asyncModule(body, hasAwait) {
    const module = this.m;
    const queue = hasAwait ? Object.assign([], {
        status: -1
    }) : undefined;
    const depQueues = new Set();
    const { resolve, reject, promise: rawPromise } = createPromise();
    const promise = Object.assign(rawPromise, {
        [turbopackExports]: module.exports,
        [turbopackQueues]: (fn)=>{
            queue && fn(queue);
            depQueues.forEach(fn);
            promise['catch'](()=>{});
        }
    });
    const attributes = {
        get () {
            return promise;
        },
        set (v) {
            // Calling `esmExport` leads to this.
            if (v !== promise) {
                promise[turbopackExports] = v;
            }
        }
    };
    Object.defineProperty(module, 'exports', attributes);
    Object.defineProperty(module, 'namespaceObject', attributes);
    function handleAsyncDependencies(deps) {
        const currentDeps = wrapDeps(deps);
        const getResult = ()=>currentDeps.map((d)=>{
                if (d[turbopackError]) throw d[turbopackError];
                return d[turbopackExports];
            });
        const { promise, resolve } = createPromise();
        const fn = Object.assign(()=>resolve(getResult), {
            queueCount: 0
        });
        function fnQueue(q) {
            if (q !== queue && !depQueues.has(q)) {
                depQueues.add(q);
                if (q && q.status === 0) {
                    fn.queueCount++;
                    q.push(fn);
                }
            }
        }
        currentDeps.map((dep)=>dep[turbopackQueues](fnQueue));
        return fn.queueCount ? promise : getResult();
    }
    function asyncResult(err) {
        if (err) {
            reject(promise[turbopackError] = err);
        } else {
            resolve(promise[turbopackExports]);
        }
        resolveQueue(queue);
    }
    body(handleAsyncDependencies, asyncResult);
    if (queue && queue.status === -1) {
        queue.status = 0;
    }
}
contextPrototype.a = asyncModule;
/**
 * A pseudo "fake" URL object to resolve to its relative path.
 *
 * When UrlRewriteBehavior is set to relative, calls to the `new URL()` will construct url without base using this
 * runtime function to generate context-agnostic urls between different rendering context, i.e ssr / client to avoid
 * hydration mismatch.
 *
 * This is based on webpack's existing implementation:
 * https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/runtime/RelativeUrlRuntimeModule.js
 */ const relativeURL = function relativeURL(inputUrl) {
    const realUrl = new URL(inputUrl, 'x:/');
    const values = {};
    for(const key in realUrl)values[key] = realUrl[key];
    values.href = inputUrl;
    values.pathname = inputUrl.replace(/[?#].*/, '');
    values.origin = values.protocol = '';
    values.toString = values.toJSON = (..._args)=>inputUrl;
    for(const key in values)Object.defineProperty(this, key, {
        enumerable: true,
        configurable: true,
        value: values[key]
    });
};
relativeURL.prototype = URL.prototype;
contextPrototype.U = relativeURL;
/**
 * Utility function to ensure all variants of an enum are handled.
 */ function invariant(never, computeMessage) {
    throw new Error(`Invariant: ${computeMessage(never)}`);
}
/**
 * A stub function to make `require` available but non-functional in ESM.
 */ function requireStub(_moduleId) {
    throw new Error('dynamic usage of require is not supported');
}
contextPrototype.z = requireStub;
// Make `globalThis` available to the module in a way that cannot be shadowed by a local variable.
contextPrototype.g = globalThis;
function applyModuleFactoryName(factory) {
    // Give the module factory a nice name to improve stack traces.
    Object.defineProperty(factory, 'name', {
        value: 'module evaluation'
    });
}
/// <reference path="../shared/runtime-utils.ts" />
/// A 'base' utilities to support runtime can have externals.
/// Currently this is for node.js / edge runtime both.
/// If a fn requires node.js specific behavior, it should be placed in `node-external-utils` instead.
async function externalImport(id) {
    let raw;
    try {
        switch (id) {
  case "next/dist/compiled/@vercel/og/index.node.js":
    raw = await import("next/dist/compiled/@vercel/og/index.edge.js");
    break;
  default:
    raw = await import(id);
};
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (raw && raw.__esModule && raw.default && 'default' in raw.default) {
        return interopEsm(raw.default, createNS(raw), true);
    }
    return raw;
}
contextPrototype.y = externalImport;
function externalRequire(id, thunk, esm = false) {
    let raw;
    try {
        raw = thunk();
    } catch (err) {
        // TODO(alexkirsz) This can happen when a client-side module tries to load
        // an external module we don't provide a shim for (e.g. querystring, url).
        // For now, we fail semi-silently, but in the future this should be a
        // compilation error.
        throw new Error(`Failed to load external module ${id}: ${err}`);
    }
    if (!esm || raw.__esModule) {
        return raw;
    }
    return interopEsm(raw, createNS(raw), true);
}
externalRequire.resolve = (id, options)=>{
    return require.resolve(id, options);
};
contextPrototype.x = externalRequire;
/* eslint-disable @typescript-eslint/no-unused-vars */ const path = require('path');
const relativePathToRuntimeRoot = path.relative(RUNTIME_PUBLIC_PATH, '.');
// Compute the relative path to the `distDir`.
const relativePathToDistRoot = path.join(relativePathToRuntimeRoot, RELATIVE_ROOT_PATH);
const RUNTIME_ROOT = path.resolve(__filename, relativePathToRuntimeRoot);
// Compute the absolute path to the root, by stripping distDir from the absolute path to this file.
const ABSOLUTE_ROOT = path.resolve(__filename, relativePathToDistRoot);
/**
 * Returns an absolute path to the given module path.
 * Module path should be relative, either path to a file or a directory.
 *
 * This fn allows to calculate an absolute path for some global static values, such as
 * `__dirname` or `import.meta.url` that Turbopack will not embeds in compile time.
 * See ImportMetaBinding::code_generation for the usage.
 */ function resolveAbsolutePath(modulePath) {
    if (modulePath) {
        return path.join(ABSOLUTE_ROOT, modulePath);
    }
    return ABSOLUTE_ROOT;
}
Context.prototype.P = resolveAbsolutePath;
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../shared/runtime-utils.ts" />
function readWebAssemblyAsResponse(path) {
    const { createReadStream } = require('fs');
    const { Readable } = require('stream');
    const stream = createReadStream(path);
    // @ts-ignore unfortunately there's a slight type mismatch with the stream.
    return new Response(Readable.toWeb(stream), {
        headers: {
            'content-type': 'application/wasm'
        }
    });
}
async function compileWebAssemblyFromPath(path) {
    const response = readWebAssemblyAsResponse(path);
    return await WebAssembly.compileStreaming(response);
}
async function instantiateWebAssemblyFromPath(path, importsObj) {
    const response = readWebAssemblyAsResponse(path);
    const { instance } = await WebAssembly.instantiateStreaming(response, importsObj);
    return instance.exports;
}
/* eslint-disable @typescript-eslint/no-unused-vars */ /// <reference path="../shared/runtime-utils.ts" />
/// <reference path="../shared-node/base-externals-utils.ts" />
/// <reference path="../shared-node/node-externals-utils.ts" />
/// <reference path="../shared-node/node-wasm-utils.ts" />
var SourceType = /*#__PURE__*/ function(SourceType) {
    /**
   * The module was instantiated because it was included in an evaluated chunk's
   * runtime.
   * SourceData is a ChunkPath.
   */ SourceType[SourceType["Runtime"] = 0] = "Runtime";
    /**
   * The module was instantiated because a parent module imported it.
   * SourceData is a ModuleId.
   */ SourceType[SourceType["Parent"] = 1] = "Parent";
    return SourceType;
}(SourceType || {});
process.env.TURBOPACK = '1';
const nodeContextPrototype = Context.prototype;
const url = require('url');
const moduleFactories = new Map();
nodeContextPrototype.M = moduleFactories;
const moduleCache = Object.create(null);
nodeContextPrototype.c = moduleCache;
/**
 * Returns an absolute path to the given module's id.
 */ function resolvePathFromModule(moduleId) {
    const exported = this.r(moduleId);
    const exportedPath = exported?.default ?? exported;
    if (typeof exportedPath !== 'string') {
        return exported;
    }
    const strippedAssetPrefix = exportedPath.slice(ASSET_PREFIX.length);
    const resolved = path.resolve(RUNTIME_ROOT, strippedAssetPrefix);
    return url.pathToFileURL(resolved).href;
}
nodeContextPrototype.R = resolvePathFromModule;
function loadRuntimeChunk(sourcePath, chunkData) {
    if (typeof chunkData === 'string') {
        loadRuntimeChunkPath(sourcePath, chunkData);
    } else {
        loadRuntimeChunkPath(sourcePath, chunkData.path);
    }
}
const loadedChunks = new Set();
const unsupportedLoadChunk = Promise.resolve(undefined);
const loadedChunk = Promise.resolve(undefined);
const chunkCache = new Map();
function clearChunkCache() {
    chunkCache.clear();
}
function loadRuntimeChunkPath(sourcePath, chunkPath) {
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return;
    }
    if (loadedChunks.has(chunkPath)) {
        return;
    }
    try {
        const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
        const chunkModules = requireChunk(chunkPath);
        installCompressedModuleFactories(chunkModules, 0, moduleFactories);
        loadedChunks.add(chunkPath);
    } catch (cause) {
        let errorMessage = `Failed to load chunk ${chunkPath}`;
        if (sourcePath) {
            errorMessage += ` from runtime for chunk ${sourcePath}`;
        }
        const error = new Error(errorMessage, {
            cause
        });
        error.name = 'ChunkLoadError';
        throw error;
    }
}
function loadChunkAsync(chunkData) {
    const chunkPath = typeof chunkData === 'string' ? chunkData : chunkData.path;
    if (!isJs(chunkPath)) {
        // We only support loading JS chunks in Node.js.
        // This branch can be hit when trying to load a CSS chunk.
        return unsupportedLoadChunk;
    }
    let entry = chunkCache.get(chunkPath);
    if (entry === undefined) {
        try {
            // resolve to an absolute path to simplify `require` handling
            const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
            // TODO: consider switching to `import()` to enable concurrent chunk loading and async file io
            // However this is incompatible with hot reloading (since `import` doesn't use the require cache)
            const chunkModules = requireChunk(chunkPath);
            installCompressedModuleFactories(chunkModules, 0, moduleFactories);
            entry = loadedChunk;
        } catch (cause) {
            const errorMessage = `Failed to load chunk ${chunkPath} from module ${this.m.id}`;
            const error = new Error(errorMessage, {
                cause
            });
            error.name = 'ChunkLoadError';
            // Cache the failure promise, future requests will also get this same rejection
            entry = Promise.reject(error);
        }
        chunkCache.set(chunkPath, entry);
    }
    // TODO: Return an instrumented Promise that React can use instead of relying on referential equality.
    return entry;
}
contextPrototype.l = loadChunkAsync;
function loadChunkAsyncByUrl(chunkUrl) {
    const path1 = url.fileURLToPath(new URL(chunkUrl, RUNTIME_ROOT));
    return loadChunkAsync.call(this, path1);
}
contextPrototype.L = loadChunkAsyncByUrl;
function loadWebAssembly(chunkPath, _edgeModule, imports) {
    const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
    return instantiateWebAssemblyFromPath(resolved, imports);
}
contextPrototype.w = loadWebAssembly;
function loadWebAssemblyModule(chunkPath, _edgeModule) {
    const resolved = path.resolve(RUNTIME_ROOT, chunkPath);
    return compileWebAssemblyFromPath(resolved);
}
contextPrototype.u = loadWebAssemblyModule;
function getWorkerBlobURL(_chunks) {
    throw new Error('Worker blobs are not implemented yet for Node.js');
}
nodeContextPrototype.b = getWorkerBlobURL;
function instantiateModule(id, sourceType, sourceData) {
    const moduleFactory = moduleFactories.get(id);
    if (typeof moduleFactory !== 'function') {
        // This can happen if modules incorrectly handle HMR disposes/updates,
        // e.g. when they keep a `setTimeout` around which still executes old code
        // and contains e.g. a `require("something")` call.
        let instantiationReason;
        switch(sourceType){
            case 0:
                instantiationReason = `as a runtime entry of chunk ${sourceData}`;
                break;
            case 1:
                instantiationReason = `because it was required from module ${sourceData}`;
                break;
            default:
                invariant(sourceType, (sourceType)=>`Unknown source type: ${sourceType}`);
        }
        throw new Error(`Module ${id} was instantiated ${instantiationReason}, but the module factory is not available.`);
    }
    const module1 = createModuleObject(id);
    const exports = module1.exports;
    moduleCache[id] = module1;
    const context = new Context(module1, exports);
    // NOTE(alexkirsz) This can fail when the module encounters a runtime error.
    try {
        moduleFactory(context, module1, exports);
    } catch (error) {
        module1.error = error;
        throw error;
    }
    module1.loaded = true;
    if (module1.namespaceObject && module1.exports !== module1.namespaceObject) {
        // in case of a circular dependency: cjs1 -> esm2 -> cjs1
        interopEsm(module1.exports, module1.namespaceObject);
    }
    return module1;
}
/**
 * Retrieves a module from the cache, or instantiate it if it is not cached.
 */ // @ts-ignore
function getOrInstantiateModuleFromParent(id, sourceModule) {
    const module1 = moduleCache[id];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateModule(id, 1, sourceModule.id);
}
/**
 * Instantiates a runtime module.
 */ function instantiateRuntimeModule(chunkPath, moduleId) {
    return instantiateModule(moduleId, 0, chunkPath);
}
/**
 * Retrieves a module from the cache, or instantiate it as a runtime module if it is not cached.
 */ // @ts-ignore TypeScript doesn't separate this module space from the browser runtime
function getOrInstantiateRuntimeModule(chunkPath, moduleId) {
    const module1 = moduleCache[moduleId];
    if (module1) {
        if (module1.error) {
            throw module1.error;
        }
        return module1;
    }
    return instantiateRuntimeModule(chunkPath, moduleId);
}
const regexJsUrl = /\.js(?:\?[^#]*)?(?:#.*)?$/;
/**
 * Checks if a given path/URL ends with .js, optionally followed by ?query or #fragment.
 */ function isJs(chunkUrlOrPath) {
    return regexJsUrl.test(chunkUrlOrPath);
}
module.exports = (sourcePath)=>({
        m: (id)=>getOrInstantiateRuntimeModule(sourcePath, id),
        c: (chunkData)=>loadRuntimeChunk(sourcePath, chunkData)
    });


//# sourceMappingURL=%5Bturbopack%5D_runtime.js.map

  function requireChunk(chunkPath) {
    switch(chunkPath) {
      case "server/chunks/ssr/[externals]_next_dist_compiled_@vercel_og_index_node_055f47ab.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[externals]_next_dist_compiled_@vercel_og_index_node_055f47ab.js");
      case "server/chunks/ssr/[root-of-the-server]__04a08650._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__04a08650._.js");
      case "server/chunks/ssr/[root-of-the-server]__2b382f2a._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__2b382f2a._.js");
      case "server/chunks/ssr/[root-of-the-server]__6ba08e0a._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__6ba08e0a._.js");
      case "server/chunks/ssr/[root-of-the-server]__7563408e._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__7563408e._.js");
      case "server/chunks/ssr/[root-of-the-server]__acfa5a5f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__acfa5a5f._.js");
      case "server/chunks/ssr/[root-of-the-server]__c846fbaf._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__c846fbaf._.js");
      case "server/chunks/ssr/[root-of-the-server]__f413520f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__f413520f._.js");
      case "server/chunks/ssr/[turbopack]_runtime.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[turbopack]_runtime.js");
      case "server/chunks/ssr/_0efddc1b._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_0efddc1b._.js");
      case "server/chunks/ssr/_97989cdc._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_97989cdc._.js");
      case "server/chunks/ssr/_next-internal_server_app__not-found_page_actions_554ec2bf.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__not-found_page_actions_554ec2bf.js");
      case "server/chunks/ssr/node_modules_77e888fe._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_77e888fe._.js");
      case "server/chunks/ssr/node_modules_abc80c0d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_abc80c0d._.js");
      case "server/chunks/ssr/node_modules_framer-motion_dist_es_render_components_motion_proxy_mjs_b72b0714._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_framer-motion_dist_es_render_components_motion_proxy_mjs_b72b0714._.js");
      case "server/chunks/ssr/node_modules_next_920e7746._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_920e7746._.js");
      case "server/chunks/ssr/node_modules_next_dist_1220a8a4._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_1220a8a4._.js");
      case "server/chunks/ssr/node_modules_next_dist_1b45ba4a._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_1b45ba4a._.js");
      case "server/chunks/ssr/node_modules_next_dist_22f8d72f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_22f8d72f._.js");
      case "server/chunks/ssr/node_modules_next_dist_27e2525e._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_27e2525e._.js");
      case "server/chunks/ssr/node_modules_next_dist_9f490790._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_9f490790._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_9774470f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_9774470f._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_forbidden_45780354.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_forbidden_45780354.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_da11c5b3.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_build_templates_app-page_da11c5b3.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_cc94c707._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_cc94c707._.js");
      case "server/chunks/ssr/node_modules_next_dist_esm_eedfc1fd._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_esm_eedfc1fd._.js");
      case "server/chunks/ssr/src_app_5b2047f8._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_5b2047f8._.js");
      case "server/chunks/ssr/src_components_746ded4e._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_746ded4e._.js");
      case "server/chunks/ssr/[root-of-the-server]__19dfcc50._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__19dfcc50._.js");
      case "server/chunks/ssr/_next-internal_server_app__global-error_page_actions_75761787.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app__global-error_page_actions_75761787.js");
      case "server/chunks/ssr/node_modules_next_dist_12287b3d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_12287b3d._.js");
      case "server/chunks/ssr/[root-of-the-server]__57ac0dbd._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__57ac0dbd._.js");
      case "server/chunks/ssr/[root-of-the-server]__78080558._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__78080558._.js");
      case "server/chunks/ssr/[root-of-the-server]__8202f56b._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__8202f56b._.js");
      case "server/chunks/ssr/[root-of-the-server]__a457c799._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__a457c799._.js");
      case "server/chunks/ssr/[root-of-the-server]__eb2663da._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__eb2663da._.js");
      case "server/chunks/ssr/[root-of-the-server]__ff36bfbe._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__ff36bfbe._.js");
      case "server/chunks/ssr/_104f1ed3._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_104f1ed3._.js");
      case "server/chunks/ssr/_e6eb0a60._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_e6eb0a60._.js");
      case "server/chunks/ssr/_fcddd9a8._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_fcddd9a8._.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_ece394eb.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_global-error_ece394eb.js");
      case "server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_15817684.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_client_components_builtin_unauthorized_15817684.js");
      case "server/chunks/ssr/[root-of-the-server]__3a53a02b._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__3a53a02b._.js");
      case "server/chunks/ssr/_2cba42bd._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_2cba42bd._.js");
      case "server/chunks/ssr/_6ba018bf._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_6ba018bf._.js");
      case "server/chunks/ssr/_78b654eb._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_78b654eb._.js");
      case "server/chunks/ssr/_82f2f49e._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_82f2f49e._.js");
      case "server/chunks/ssr/_8b98a7f5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_8b98a7f5._.js");
      case "server/chunks/ssr/_d2357694._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_d2357694._.js");
      case "server/chunks/ssr/node_modules_next_10fb6ad9._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_10fb6ad9._.js");
      case "server/chunks/ssr/node_modules_next_dist_981dc6eb._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_981dc6eb._.js");
      case "server/chunks/ssr/src_app_admin_layout_tsx_07d69fb5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_layout_tsx_07d69fb5._.js");
      case "server/chunks/ssr/[root-of-the-server]__b4c1b916._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__b4c1b916._.js");
      case "server/chunks/ssr/_39681e88._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_39681e88._.js");
      case "server/chunks/ssr/_e47bb4dd._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_e47bb4dd._.js");
      case "server/chunks/ssr/[root-of-the-server]__f0e0f242._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__f0e0f242._.js");
      case "server/chunks/ssr/_170c538f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_170c538f._.js");
      case "server/chunks/ssr/_97ac7b94._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_97ac7b94._.js");
      case "server/chunks/ssr/node_modules_a603c0a6._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_a603c0a6._.js");
      case "server/chunks/ssr/src_app_admin_blog_page_tsx_f7bb10a7._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_blog_page_tsx_f7bb10a7._.js");
      case "server/chunks/ssr/[root-of-the-server]__7d9641a7._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__7d9641a7._.js");
      case "server/chunks/ssr/[root-of-the-server]__a21b8a51._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__a21b8a51._.js");
      case "server/chunks/ssr/_063f7f4d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_063f7f4d._.js");
      case "server/chunks/ssr/_06b7365d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_06b7365d._.js");
      case "server/chunks/ssr/node_modules_742614a6._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_742614a6._.js");
      case "server/chunks/ssr/[root-of-the-server]__80249285._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__80249285._.js");
      case "server/chunks/ssr/_157cc258._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_157cc258._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_login_page_actions_0700d525.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_login_page_actions_0700d525.js");
      case "server/chunks/ssr/src_app_admin_login_page_tsx_6bc5dee1._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_login_page_tsx_6bc5dee1._.js");
      case "server/chunks/ssr/[root-of-the-server]__0de32cb6._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0de32cb6._.js");
      case "server/chunks/ssr/[root-of-the-server]__b971fc93._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__b971fc93._.js");
      case "server/chunks/ssr/_83402041._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_83402041._.js");
      case "server/chunks/ssr/_c223f1c1._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_c223f1c1._.js");
      case "server/chunks/ssr/node_modules_next_dist_build_webpack_loaders_next-flight-loader_aad926ff._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_build_webpack_loaders_next-flight-loader_aad926ff._.js");
      case "server/chunks/ssr/[root-of-the-server]__0588db77._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0588db77._.js");
      case "server/chunks/ssr/[root-of-the-server]__c88c6d56._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__c88c6d56._.js");
      case "server/chunks/ssr/_13c3426d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_13c3426d._.js");
      case "server/chunks/ssr/_e8bd0b6c._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_e8bd0b6c._.js");
      case "server/chunks/ssr/_e929d06e._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_e929d06e._.js");
      case "server/chunks/ssr/src_app_admin_photos_[id]_page_tsx_bf833f7b._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_photos_[id]_page_tsx_bf833f7b._.js");
      case "server/chunks/ssr/src_lib_algolia_ts_f6da2f7d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_algolia_ts_f6da2f7d._.js");
      case "server/chunks/ssr/[root-of-the-server]__0b89e994._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__0b89e994._.js");
      case "server/chunks/ssr/[root-of-the-server]__9eb67e5c._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__9eb67e5c._.js");
      case "server/chunks/ssr/_5d81acc5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_5d81acc5._.js");
      case "server/chunks/ssr/_b02bff17._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_b02bff17._.js");
      case "server/chunks/ssr/src_app_admin_photos_new_page_tsx_b398d527._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_photos_new_page_tsx_b398d527._.js");
      case "server/chunks/ssr/src_lib_actions_c9badddf._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_actions_c9badddf._.js");
      case "server/chunks/ssr/src_lib_utils_client-image_ts_56fe8b3a._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_lib_utils_client-image_ts_56fe8b3a._.js");
      case "server/chunks/ssr/[root-of-the-server]__43f1c04b._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__43f1c04b._.js");
      case "server/chunks/ssr/[root-of-the-server]__bfb2a7c2._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__bfb2a7c2._.js");
      case "server/chunks/ssr/_b4cfd6a5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_b4cfd6a5._.js");
      case "server/chunks/ssr/_e3ff2fc0._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_e3ff2fc0._.js");
      case "server/chunks/ssr/src_app_admin_photos_page_tsx_c3092e3f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_photos_page_tsx_c3092e3f._.js");
      case "server/chunks/ssr/[root-of-the-server]__ceb4ca54._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__ceb4ca54._.js");
      case "server/chunks/ssr/_0c59bc76._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_0c59bc76._.js");
      case "server/chunks/ssr/_0c7eb598._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_0c7eb598._.js");
      case "server/chunks/ssr/_68b0d512._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_68b0d512._.js");
      case "server/chunks/ssr/_9fffe154._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_9fffe154._.js");
      case "server/chunks/ssr/[root-of-the-server]__db5f0634._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__db5f0634._.js");
      case "server/chunks/ssr/[root-of-the-server]__fda20939._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__fda20939._.js");
      case "server/chunks/ssr/_73a6239e._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_73a6239e._.js");
      case "server/chunks/ssr/_ca1edf12._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_ca1edf12._.js");
      case "server/chunks/ssr/[root-of-the-server]__d2cc1ea8._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__d2cc1ea8._.js");
      case "server/chunks/ssr/_25335ead._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_25335ead._.js");
      case "server/chunks/ssr/_next-internal_server_app_admin_reset-password_page_actions_cbefad1e.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_admin_reset-password_page_actions_cbefad1e.js");
      case "server/chunks/ssr/src_app_admin_reset-password_page_tsx_713d79a0._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_admin_reset-password_page_tsx_713d79a0._.js");
      case "server/chunks/ssr/[root-of-the-server]__9553f19b._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__9553f19b._.js");
      case "server/chunks/ssr/_af7ab14d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_af7ab14d._.js");
      case "server/chunks/ssr/_c68cc8f1._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_c68cc8f1._.js");
      case "server/chunks/ssr/_c73e24c5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_c73e24c5._.js");
      case "server/chunks/ssr/[root-of-the-server]__6fde7e4f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__6fde7e4f._.js");
      case "server/chunks/ssr/_6138cc17._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_6138cc17._.js");
      case "server/chunks/ssr/_6b546abc._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_6b546abc._.js");
      case "server/chunks/[root-of-the-server]__1889bbaf._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__1889bbaf._.js");
      case "server/chunks/[root-of-the-server]__71e0e3b9._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__71e0e3b9._.js");
      case "server/chunks/[root-of-the-server]__a280b1f5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__a280b1f5._.js");
      case "server/chunks/[turbopack]_runtime.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[turbopack]_runtime.js");
      case "server/chunks/_next-internal_server_app_api_upload_r2-presigned_route_actions_4767d081.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_upload_r2-presigned_route_actions_4767d081.js");
      case "server/chunks/[root-of-the-server]__84774fa8._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__84774fa8._.js");
      case "server/chunks/[root-of-the-server]__d8efa065._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__d8efa065._.js");
      case "server/chunks/_next-internal_server_app_api_upload_resize_route_actions_b96a2e42.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_upload_resize_route_actions_b96a2e42.js");
      case "server/chunks/node_modules_697b02d2._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/node_modules_697b02d2._.js");
      case "server/chunks/[root-of-the-server]__b8997047._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__b8997047._.js");
      case "server/chunks/_next-internal_server_app_api_upload_resize-async_route_actions_ac1f26f6.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_upload_resize-async_route_actions_ac1f26f6.js");
      case "server/chunks/[root-of-the-server]__71c834b1._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__71c834b1._.js");
      case "server/chunks/[root-of-the-server]__fa409e71._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__fa409e71._.js");
      case "server/chunks/_next-internal_server_app_api_upload_resize-remote_route_actions_60217f5f.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_upload_resize-remote_route_actions_60217f5f.js");
      case "server/chunks/[root-of-the-server]__5d8178a1._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__5d8178a1._.js");
      case "server/chunks/_next-internal_server_app_api_upload_sign_route_actions_8ce93074.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_api_upload_sign_route_actions_8ce93074.js");
      case "server/chunks/ssr/[root-of-the-server]__e7789ecb._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__e7789ecb._.js");
      case "server/chunks/ssr/_1862566b._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_1862566b._.js");
      case "server/chunks/ssr/_b2d94645._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_b2d94645._.js");
      case "server/chunks/ssr/_next-internal_server_app_blog_[id]_page_actions_dd81b08e.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_blog_[id]_page_actions_dd81b08e.js");
      case "server/chunks/ssr/node_modules_date-fns_format_0b226746.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_date-fns_format_0b226746.js");
      case "server/chunks/ssr/node_modules_next_dist_cbd2ad23._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/node_modules_next_dist_cbd2ad23._.js");
      case "server/chunks/ssr/[root-of-the-server]__c21bd57a._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__c21bd57a._.js");
      case "server/chunks/ssr/_032d28b3._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_032d28b3._.js");
      case "server/chunks/ssr/_next-internal_server_app_blog_page_actions_cb4aaadc.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_blog_page_actions_cb4aaadc.js");
      case "server/chunks/ssr/[root-of-the-server]__15ee9f26._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__15ee9f26._.js");
      case "server/chunks/ssr/_a8a06986._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_a8a06986._.js");
      case "server/chunks/ssr/_next-internal_server_app_contact_page_actions_44e32ac3.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_contact_page_actions_44e32ac3.js");
      case "server/chunks/ssr/[root-of-the-server]__da9510e6._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__da9510e6._.js");
      case "server/chunks/ssr/_36bcab64._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_36bcab64._.js");
      case "server/chunks/ssr/_next-internal_server_app_dashboard_page_actions_7f01ccec.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_dashboard_page_actions_7f01ccec.js");
      case "server/chunks/ssr/src_app_dashboard_page_tsx_196c74b5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_dashboard_page_tsx_196c74b5._.js");
      case "server/chunks/ssr/[root-of-the-server]__bdafff6d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__bdafff6d._.js");
      case "server/chunks/ssr/[root-of-the-server]__dd528561._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__dd528561._.js");
      case "server/chunks/ssr/_2efd36c4._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_2efd36c4._.js");
      case "server/chunks/ssr/_5eb91e6f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_5eb91e6f._.js");
      case "server/chunks/ssr/[root-of-the-server]__59c9c01f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__59c9c01f._.js");
      case "server/chunks/ssr/[root-of-the-server]__d69bda93._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__d69bda93._.js");
      case "server/chunks/ssr/_533df99e._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_533df99e._.js");
      case "server/chunks/ssr/_99a7c270._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_99a7c270._.js");
      case "server/chunks/ssr/[root-of-the-server]__b5237f42._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__b5237f42._.js");
      case "server/chunks/ssr/[root-of-the-server]__d39892bb._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__d39892bb._.js");
      case "server/chunks/ssr/_258c10c5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_258c10c5._.js");
      case "server/chunks/ssr/_29e95342._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_29e95342._.js");
      case "server/chunks/[externals]_next_dist_b89b5a39._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[externals]_next_dist_b89b5a39._.js");
      case "server/chunks/_next-internal_server_app_favicon_ico_route_actions_353150a5.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_favicon_ico_route_actions_353150a5.js");
      case "server/chunks/node_modules_next_dist_esm_build_templates_app-route_f5680d9e.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/node_modules_next_dist_esm_build_templates_app-route_f5680d9e.js");
      case "server/chunks/ssr/[root-of-the-server]__04042608._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__04042608._.js");
      case "server/chunks/ssr/[root-of-the-server]__7e9da55d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__7e9da55d._.js");
      case "server/chunks/ssr/_31ceecc9._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_31ceecc9._.js");
      case "server/chunks/ssr/_9cf54d42._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_9cf54d42._.js");
      case "server/chunks/ssr/src_components_gallery_PhotoGrid_tsx_ffd2dcaf._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_components_gallery_PhotoGrid_tsx_ffd2dcaf._.js");
      case "server/chunks/[externals]_next_dist_compiled_@vercel_og_index_node_055f47ab.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[externals]_next_dist_compiled_@vercel_og_index_node_055f47ab.js");
      case "server/chunks/[root-of-the-server]__f3492390._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/[root-of-the-server]__f3492390._.js");
      case "server/chunks/_next-internal_server_app_photo_[id]_opengraph-image_route_actions_a4acd165.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/_next-internal_server_app_photo_[id]_opengraph-image_route_actions_a4acd165.js");
      case "server/chunks/node_modules_next_68362693._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/node_modules_next_68362693._.js");
      case "server/chunks/src_lib_algolia_ts_b937241b._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/src_lib_algolia_ts_b937241b._.js");
      case "server/chunks/ssr/[root-of-the-server]__110bbfba._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__110bbfba._.js");
      case "server/chunks/ssr/[root-of-the-server]__85a59ae3._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__85a59ae3._.js");
      case "server/chunks/ssr/_4591cbbf._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_4591cbbf._.js");
      case "server/chunks/ssr/_next-internal_server_app_photo_[id]_page_actions_9b9a672c.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_photo_[id]_page_actions_9b9a672c.js");
      case "server/chunks/ssr/[root-of-the-server]__4a585012._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__4a585012._.js");
      case "server/chunks/ssr/[root-of-the-server]__d7390690._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__d7390690._.js");
      case "server/chunks/ssr/_9ff326e3._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_9ff326e3._.js");
      case "server/chunks/ssr/_ea23a807._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_ea23a807._.js");
      case "server/chunks/ssr/[root-of-the-server]__fb15d7e5._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__fb15d7e5._.js");
      case "server/chunks/ssr/_5c53d72d._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_5c53d72d._.js");
      case "server/chunks/ssr/_dadcca8c._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_dadcca8c._.js");
      case "server/chunks/ssr/_db309993._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_db309993._.js");
      case "server/chunks/ssr/[root-of-the-server]__6b705f1f._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__6b705f1f._.js");
      case "server/chunks/ssr/_c1b8071c._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_c1b8071c._.js");
      case "server/chunks/ssr/_next-internal_server_app_register_page_actions_cf89a161.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_register_page_actions_cf89a161.js");
      case "server/chunks/ssr/[root-of-the-server]__a438725c._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__a438725c._.js");
      case "server/chunks/ssr/_93ec9361._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_93ec9361._.js");
      case "server/chunks/ssr/_next-internal_server_app_register_terms_page_actions_cd1ee683.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_register_terms_page_actions_cd1ee683.js");
      case "server/chunks/ssr/src_app_register_terms_page_tsx_aff1d32c._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/src_app_register_terms_page_tsx_aff1d32c._.js");
      case "server/chunks/ssr/[root-of-the-server]__3d2b5370._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__3d2b5370._.js");
      case "server/chunks/ssr/[root-of-the-server]__ddeaabac._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/[root-of-the-server]__ddeaabac._.js");
      case "server/chunks/ssr/_b88bd420._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_b88bd420._.js");
      case "server/chunks/ssr/_e258be90._.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_e258be90._.js");
      case "server/chunks/ssr/_next-internal_server_app_search_page_actions_77f91a66.js": return require("/Users/daitan/.gemini/antigravity/scratch/next-portfolio/.open-next/server-functions/default/.next/server/chunks/ssr/_next-internal_server_app_search_page_actions_77f91a66.js");
      default:
        throw new Error(`Not found ${chunkPath}`);
    }
  }
