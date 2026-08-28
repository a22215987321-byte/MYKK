import { splitLinks, toHref } from "../linkify";

const links = (s) => splitLinks(s).filter(t => t.type === "link");
const texts = (s) => splitLinks(s).filter(t => t.type === "text").map(t => t.value);

describe("splitLinks", () => {
  test("整則訊息就是一個網址", () => {
    const t = splitLinks("https://www.evonchat.com/files/taiwan-github-top500.pdf");
    expect(t).toHaveLength(1);
    expect(t[0]).toEqual({
      type: "link",
      value: "https://www.evonchat.com/files/taiwan-github-top500.pdf",
      href: "https://www.evonchat.com/files/taiwan-github-top500.pdf",
    });
  });

  test("網址夾在中文句子中間，前後文字要保留", () => {
    const t = splitLinks("看這個 https://evonchat.com/a 很讚");
    expect(t.map(x => x.type)).toEqual(["text", "link", "text"]);
    expect(t[0].value).toBe("看這個 ");
    expect(t[1].value).toBe("https://evonchat.com/a");
    expect(t[2].value).toBe(" 很讚");
  });

  test("句尾標點不算網址的一部分", () => {
    expect(links("看這個 https://evonchat.com/a。")[0].value).toBe("https://evonchat.com/a");
    expect(texts("看這個 https://evonchat.com/a。")).toContain("。");
    expect(links("see https://evonchat.com/a.")[0].value).toBe("https://evonchat.com/a");
    expect(links("see https://evonchat.com/a, ok")[0].value).toBe("https://evonchat.com/a");
  });

  test("括號：多出來的右括號切掉，成對的留著", () => {
    expect(links("(https://evonchat.com/a)")[0].value).toBe("https://evonchat.com/a");
    expect(links("https://en.wikipedia.org/wiki/Foo_(bar)")[0].value)
      .toBe("https://en.wikipedia.org/wiki/Foo_(bar)");
  });

  test("www 開頭補上 https:// 當 href，顯示文字不變", () => {
    const l = links("www.evonchat.com/files/a.pdf")[0];
    expect(l.value).toBe("www.evonchat.com/files/a.pdf");
    expect(l.href).toBe("https://www.evonchat.com/files/a.pdf");
  });

  test("一則訊息裡有多個網址", () => {
    expect(links("https://a.com 跟 https://b.com/x").map(l => l.value))
      .toEqual(["https://a.com", "https://b.com/x"]);
  });

  test("網址的 #fragment 要留在網址裡", () => {
    expect(links("https://evonchat.com/a#section")[0].value)
      .toBe("https://evonchat.com/a#section");
  });

  test("javascript: / data: 不會變成連結", () => {
    expect(links("javascript:alert(1)")).toHaveLength(0);
    expect(links("data:text/html,<script>alert(1)</script>")).toHaveLength(0);
  });

  test("不是網址的東西不會被誤判", () => {
    expect(links("這句話沒有連結")).toHaveLength(0);
    expect(links("結尾是 www. 而已")).toHaveLength(0);
    expect(links("檔名 report.pdf 不是網址")).toHaveLength(0);
  });

  test("空字串／null 安全", () => {
    expect(splitLinks("")).toEqual([]);
    expect(splitLinks(null)).toEqual([]);
    expect(splitLinks(undefined)).toEqual([]);
  });

  test("切出來的 token 接回去要等於原字串（不吃字、不重複）", () => {
    const samples = [
      "看這個 https://evonchat.com/a。再看 www.example.com/b, 就這樣",
      "(https://a.com/x) 跟 https://b.com/y#z！",
      "沒有連結的一句話",
      "www. 只有這樣",
    ];
    for (const s of samples) {
      expect(splitLinks(s).map(t => t.value).join("")).toBe(s);
    }
  });
});

describe("toHref", () => {
  test("http/https 原樣，www 補 https", () => {
    expect(toHref("http://a.com")).toBe("http://a.com");
    expect(toHref("https://a.com")).toBe("https://a.com");
    expect(toHref("www.a.com")).toBe("https://www.a.com");
    expect(toHref("WWW.A.COM")).toBe("https://WWW.A.COM");
  });
});
