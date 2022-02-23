// const BuiltinModule = require('module');
// const path = require('path');

// const Module = module.constructor.length > 1 ? module.constructor : BuiltinModule;

// function patchCommonJsLoader() {
//   const extensions = Module._extensions;
//   const jsHandler = extensions['.js'];

//   extensions['.js'] = function (module, filename) {
//     return jsHandler.call(this, module, filename);
//   };
// }

// const register = () => {
//   patchCommonJsLoader();
// };

// register();
