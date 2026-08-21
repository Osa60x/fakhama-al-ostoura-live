import { describe, expect, it } from "vitest";
import { validatePngLogo } from "../worker/logo";

function png(width: number, height: number) {
  const bytes = new Uint8Array(24);
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10]);
  new DataView(bytes.buffer).setUint32(16, width);
  new DataView(bytes.buffer).setUint32(20, height);
  return bytes;
}

describe("شعار PNG", () => {
  it("يقبل PNG بالأبعاد المسموحة", () => expect(validatePngLogo(png(512, 512))).toEqual({ width: 512, height: 512 }));
  it("يرفض أي ملف ليس PNG", () => expect(() => validatePngLogo(new Uint8Array(24))).toThrow("يقبل النظام شعار PNG فقط"));
  it("يرفض أبعاد الشعار غير الآمنة", () => expect(() => validatePngLogo(png(4096, 512))).toThrow("أبعاد الشعار"));
});
