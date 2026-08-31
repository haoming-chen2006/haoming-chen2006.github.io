import { LuaFactory } from 'wasmoon';
const factory = new LuaFactory();
const lua = await factory.createEngine();
lua.global.set('hostPrint', (...a) => console.log('[lua]', ...a));
lua.global.set('binIn', (s) => {
  const bytes = [];
  for (let i=0;i<s.length;i++) bytes.push(s.charCodeAt(i));
  return JSON.stringify(bytes);
});
await lua.doString(`
  hostPrint(_VERSION, "hello from lua")
  local s = string.char(0x01, 0xFF, 0x80, 0x41, 0x00, 0xC3, 0x28)
  hostPrint("len in lua:", #s)
  hostPrint("roundtrip:", binIn(s))
`);
console.log('cbor test');
lua.global.close();
