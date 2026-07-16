// 西班牙語常用不規則動詞資料表。
// 只儲存「真正不規則」的欄位；沒有列出的欄位（例如大部分動詞的未完成過去式、
// 現在分詞、過去分詞）代表該動詞在那個時態其實是規則變化，由 verbEngine.js
// 呼叫規則引擎計算，不會顯示「資料稍後加入」。
//
// 欄位說明：
//   presente / preteritoIndefinido / subjuntivoPresente：六人稱物件，必填。
//   preteritoImperfecto：只有 ser / ir / ver 需要（其餘動詞此時態規則變化）。
//   futureStem：簡單未來式與條件式的不規則詞幹（例如 tener → tendr-）。
//                不填代表用原形本身（規則）。
//   tuAfirmativo：tú 肯定命令式的不規則形式。不填代表用現在式 él/ella/usted 形式（規則）。
//   participio / gerundio：不規則的過去分詞／現在分詞。不填代表規則變化。

function six(a, b, c, d, e, f) {
  return { yo: a, tu: b, elEllaUsted: c, nosotros: d, vosotros: e, ellosEllasUstedes: f };
}

export const IRREGULAR_VERBS = {
  ser: {
    presente: six("soy", "eres", "es", "somos", "sois", "son"),
    preteritoIndefinido: six("fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"),
    preteritoImperfecto: six("era", "eras", "era", "éramos", "erais", "eran"),
    subjuntivoPresente: six("sea", "seas", "sea", "seamos", "seáis", "sean"),
    tuAfirmativo: "sé",
  },
  estar: {
    presente: six("estoy", "estás", "está", "estamos", "estáis", "están"),
    preteritoIndefinido: six("estuve", "estuviste", "estuvo", "estuvimos", "estuvisteis", "estuvieron"),
    subjuntivoPresente: six("esté", "estés", "esté", "estemos", "estéis", "estén"),
  },
  ir: {
    presente: six("voy", "vas", "va", "vamos", "vais", "van"),
    preteritoIndefinido: six("fui", "fuiste", "fue", "fuimos", "fuisteis", "fueron"),
    preteritoImperfecto: six("iba", "ibas", "iba", "íbamos", "ibais", "iban"),
    subjuntivoPresente: six("vaya", "vayas", "vaya", "vayamos", "vayáis", "vayan"),
    tuAfirmativo: "ve",
    gerundio: "yendo",
  },
  tener: {
    presente: six("tengo", "tienes", "tiene", "tenemos", "tenéis", "tienen"),
    preteritoIndefinido: six("tuve", "tuviste", "tuvo", "tuvimos", "tuvisteis", "tuvieron"),
    futureStem: "tendr",
    subjuntivoPresente: six("tenga", "tengas", "tenga", "tengamos", "tengáis", "tengan"),
    tuAfirmativo: "ten",
  },
  hacer: {
    presente: six("hago", "haces", "hace", "hacemos", "hacéis", "hacen"),
    preteritoIndefinido: six("hice", "hiciste", "hizo", "hicimos", "hicisteis", "hicieron"),
    futureStem: "har",
    subjuntivoPresente: six("haga", "hagas", "haga", "hagamos", "hagáis", "hagan"),
    tuAfirmativo: "haz",
    participio: "hecho",
  },
  decir: {
    presente: six("digo", "dices", "dice", "decimos", "decís", "dicen"),
    preteritoIndefinido: six("dije", "dijiste", "dijo", "dijimos", "dijisteis", "dijeron"),
    futureStem: "dir",
    subjuntivoPresente: six("diga", "digas", "diga", "digamos", "digáis", "digan"),
    tuAfirmativo: "di",
    participio: "dicho",
    gerundio: "diciendo",
  },
  poder: {
    presente: six("puedo", "puedes", "puede", "podemos", "podéis", "pueden"),
    preteritoIndefinido: six("pude", "pudiste", "pudo", "pudimos", "pudisteis", "pudieron"),
    futureStem: "podr",
    subjuntivoPresente: six("pueda", "puedas", "pueda", "podamos", "podáis", "puedan"),
    gerundio: "pudiendo",
  },
  querer: {
    presente: six("quiero", "quieres", "quiere", "queremos", "queréis", "quieren"),
    preteritoIndefinido: six("quise", "quisiste", "quiso", "quisimos", "quisisteis", "quisieron"),
    futureStem: "querr",
    subjuntivoPresente: six("quiera", "quieras", "quiera", "queramos", "queráis", "quieran"),
  },
  venir: {
    presente: six("vengo", "vienes", "viene", "venimos", "venís", "vienen"),
    preteritoIndefinido: six("vine", "viniste", "vino", "vinimos", "vinisteis", "vinieron"),
    futureStem: "vendr",
    subjuntivoPresente: six("venga", "vengas", "venga", "vengamos", "vengáis", "vengan"),
    tuAfirmativo: "ven",
    gerundio: "viniendo",
  },
  poner: {
    presente: six("pongo", "pones", "pone", "ponemos", "ponéis", "ponen"),
    preteritoIndefinido: six("puse", "pusiste", "puso", "pusimos", "pusisteis", "pusieron"),
    futureStem: "pondr",
    subjuntivoPresente: six("ponga", "pongas", "ponga", "pongamos", "pongáis", "pongan"),
    tuAfirmativo: "pon",
    participio: "puesto",
  },
  salir: {
    presente: six("salgo", "sales", "sale", "salimos", "salís", "salen"),
    preteritoIndefinido: six("salí", "saliste", "salió", "salimos", "salisteis", "salieron"),
    futureStem: "saldr",
    subjuntivoPresente: six("salga", "salgas", "salga", "salgamos", "salgáis", "salgan"),
    tuAfirmativo: "sal",
  },
  dar: {
    presente: six("doy", "das", "da", "damos", "dais", "dan"),
    preteritoIndefinido: six("di", "diste", "dio", "dimos", "disteis", "dieron"),
    subjuntivoPresente: six("dé", "des", "dé", "demos", "deis", "den"),
  },
  ver: {
    presente: six("veo", "ves", "ve", "vemos", "veis", "ven"),
    preteritoIndefinido: six("vi", "viste", "vio", "vimos", "visteis", "vieron"),
    preteritoImperfecto: six("veía", "veías", "veía", "veíamos", "veíais", "veían"),
    subjuntivoPresente: six("vea", "veas", "vea", "veamos", "veáis", "vean"),
    participio: "visto",
  },
  saber: {
    presente: six("sé", "sabes", "sabe", "sabemos", "sabéis", "saben"),
    preteritoIndefinido: six("supe", "supiste", "supo", "supimos", "supisteis", "supieron"),
    futureStem: "sabr",
    subjuntivoPresente: six("sepa", "sepas", "sepa", "sepamos", "sepáis", "sepan"),
  },
  haber: {
    presente: six("he", "has", "ha", "hemos", "habéis", "han"),
    preteritoIndefinido: six("hube", "hubiste", "hubo", "hubimos", "hubisteis", "hubieron"),
    futureStem: "habr",
    subjuntivoPresente: six("haya", "hayas", "haya", "hayamos", "hayáis", "hayan"),
  },
  caber: {
    presente: six("quepo", "cabes", "cabe", "cabemos", "cabéis", "caben"),
    preteritoIndefinido: six("cupe", "cupiste", "cupo", "cupimos", "cupisteis", "cupieron"),
    futureStem: "cabr",
    subjuntivoPresente: six("quepa", "quepas", "quepa", "quepamos", "quepáis", "quepan"),
  },
  traer: {
    presente: six("traigo", "traes", "trae", "traemos", "traéis", "traen"),
    preteritoIndefinido: six("traje", "trajiste", "trajo", "trajimos", "trajisteis", "trajeron"),
    subjuntivoPresente: six("traiga", "traigas", "traiga", "traigamos", "traigáis", "traigan"),
    participio: "traído",
  },
  oír: {
    presente: six("oigo", "oyes", "oye", "oímos", "oís", "oyen"),
    preteritoIndefinido: six("oí", "oíste", "oyó", "oímos", "oísteis", "oyeron"),
    subjuntivoPresente: six("oiga", "oigas", "oiga", "oigamos", "oigáis", "oigan"),
    tuAfirmativo: "oye",
    participio: "oído",
  },
  pedir: {
    presente: six("pido", "pides", "pide", "pedimos", "pedís", "piden"),
    preteritoIndefinido: six("pedí", "pediste", "pidió", "pedimos", "pedisteis", "pidieron"),
    subjuntivoPresente: six("pida", "pidas", "pida", "pidamos", "pidáis", "pidan"),
    gerundio: "pidiendo",
  },
  preferir: {
    presente: six("prefiero", "prefieres", "prefiere", "preferimos", "preferís", "prefieren"),
    preteritoIndefinido: six("preferí", "preferiste", "prefirió", "preferimos", "preferisteis", "prefirieron"),
    subjuntivoPresente: six("prefiera", "prefieras", "prefiera", "prefiramos", "prefiráis", "prefieran"),
    gerundio: "prefiriendo",
  },
  dormir: {
    presente: six("duermo", "duermes", "duerme", "dormimos", "dormís", "duermen"),
    preteritoIndefinido: six("dormí", "dormiste", "durmió", "dormimos", "dormisteis", "durmieron"),
    subjuntivoPresente: six("duerma", "duermas", "duerma", "durmamos", "durmáis", "duerman"),
    gerundio: "durmiendo",
  },
  sentir: {
    presente: six("siento", "sientes", "siente", "sentimos", "sentís", "sienten"),
    preteritoIndefinido: six("sentí", "sentiste", "sintió", "sentimos", "sentisteis", "sintieron"),
    subjuntivoPresente: six("sienta", "sientas", "sienta", "sintamos", "sintáis", "sientan"),
    gerundio: "sintiendo",
  },
  seguir: {
    presente: six("sigo", "sigues", "sigue", "seguimos", "seguís", "siguen"),
    preteritoIndefinido: six("seguí", "seguiste", "siguió", "seguimos", "seguisteis", "siguieron"),
    subjuntivoPresente: six("siga", "sigas", "siga", "sigamos", "sigáis", "sigan"),
    gerundio: "siguiendo",
  },
  jugar: {
    presente: six("juego", "juegas", "juega", "jugamos", "jugáis", "juegan"),
    preteritoIndefinido: six("jugué", "jugaste", "jugó", "jugamos", "jugasteis", "jugaron"),
    subjuntivoPresente: six("juegue", "juegues", "juegue", "juguemos", "juguéis", "jueguen"),
  },
  conocer: {
    presente: six("conozco", "conoces", "conoce", "conocemos", "conocéis", "conocen"),
    preteritoIndefinido: six("conocí", "conociste", "conoció", "conocimos", "conocisteis", "conocieron"),
    subjuntivoPresente: six("conozca", "conozcas", "conozca", "conozcamos", "conozcáis", "conozcan"),
  },
  conseguir: {
    presente: six("consigo", "consigues", "consigue", "conseguimos", "conseguís", "consiguen"),
    preteritoIndefinido: six("conseguí", "conseguiste", "consiguió", "conseguimos", "conseguisteis", "consiguieron"),
    subjuntivoPresente: six("consiga", "consigas", "consiga", "consigamos", "consigáis", "consigan"),
    gerundio: "consiguiendo",
  },
  producir: {
    presente: six("produzco", "produces", "produce", "producimos", "producís", "producen"),
    preteritoIndefinido: six("produje", "produjiste", "produjo", "produjimos", "produjisteis", "produjeron"),
    subjuntivoPresente: six("produzca", "produzcas", "produzca", "produzcamos", "produzcáis", "produzcan"),
  },
  traducir: {
    presente: six("traduzco", "traduces", "traduce", "traducimos", "traducís", "traducen"),
    preteritoIndefinido: six("traduje", "tradujiste", "tradujo", "tradujimos", "tradujisteis", "tradujeron"),
    subjuntivoPresente: six("traduzca", "traduzcas", "traduzca", "traduzcamos", "traduzcáis", "traduzcan"),
  },

  // ── e→ie 詞幹變化（-ar）── 只有 yo/tú/él/ellos 四個人稱變化，nosotros/vosotros 規則
  empezar: {
    presente: six("empiezo", "empiezas", "empieza", "empezamos", "empezáis", "empiezan"),
    preteritoIndefinido: six("empecé", "empezaste", "empezó", "empezamos", "empezasteis", "empezaron"),
    subjuntivoPresente: six("empiece", "empieces", "empiece", "empecemos", "empecéis", "empiecen"),
  },
  cerrar: {
    presente: six("cierro", "cierras", "cierra", "cerramos", "cerráis", "cierran"),
    preteritoIndefinido: six("cerré", "cerraste", "cerró", "cerramos", "cerrasteis", "cerraron"),
    subjuntivoPresente: six("cierre", "cierres", "cierre", "cerremos", "cerréis", "cierren"),
  },
  pensar: {
    presente: six("pienso", "piensas", "piensa", "pensamos", "pensáis", "piensan"),
    preteritoIndefinido: six("pensé", "pensaste", "pensó", "pensamos", "pensasteis", "pensaron"),
    subjuntivoPresente: six("piense", "pienses", "piense", "pensemos", "penséis", "piensen"),
  },

  // ── e→ie 詞幹變化（-er）──
  entender: {
    presente: six("entiendo", "entiendes", "entiende", "entendemos", "entendéis", "entienden"),
    preteritoIndefinido: six("entendí", "entendiste", "entendió", "entendimos", "entendisteis", "entendieron"),
    subjuntivoPresente: six("entienda", "entiendas", "entienda", "entendamos", "entendáis", "entiendan"),
  },
  perder: {
    presente: six("pierdo", "pierdes", "pierde", "perdemos", "perdéis", "pierden"),
    preteritoIndefinido: six("perdí", "perdiste", "perdió", "perdimos", "perdisteis", "perdieron"),
    subjuntivoPresente: six("pierda", "pierdas", "pierda", "perdamos", "perdáis", "pierdan"),
  },

  // ── o→ue 詞幹變化（-er/-ar）──
  volver: {
    presente: six("vuelvo", "vuelves", "vuelve", "volvemos", "volvéis", "vuelven"),
    preteritoIndefinido: six("volví", "volviste", "volvió", "volvimos", "volvisteis", "volvieron"),
    subjuntivoPresente: six("vuelva", "vuelvas", "vuelva", "volvamos", "volváis", "vuelvan"),
    participio: "vuelto",
  },
  encontrar: {
    presente: six("encuentro", "encuentras", "encuentra", "encontramos", "encontráis", "encuentran"),
    preteritoIndefinido: six("encontré", "encontraste", "encontró", "encontramos", "encontrasteis", "encontraron"),
    subjuntivoPresente: six("encuentre", "encuentres", "encuentre", "encontremos", "encontréis", "encuentren"),
  },
  mostrar: {
    presente: six("muestro", "muestras", "muestra", "mostramos", "mostráis", "muestran"),
    preteritoIndefinido: six("mostré", "mostraste", "mostró", "mostramos", "mostrasteis", "mostraron"),
    subjuntivoPresente: six("muestre", "muestres", "muestre", "mostremos", "mostréis", "muestren"),
  },
  recordar: {
    presente: six("recuerdo", "recuerdas", "recuerda", "recordamos", "recordáis", "recuerdan"),
    preteritoIndefinido: six("recordé", "recordaste", "recordó", "recordamos", "recordasteis", "recordaron"),
    subjuntivoPresente: six("recuerde", "recuerdes", "recuerde", "recordemos", "recordéis", "recuerden"),
  },
  almorzar: {
    presente: six("almuerzo", "almuerzas", "almuerza", "almorzamos", "almorzáis", "almuerzan"),
    preteritoIndefinido: six("almorcé", "almorzaste", "almorzó", "almorzamos", "almorzasteis", "almorzaron"),
    subjuntivoPresente: six("almuerce", "almuerces", "almuerce", "almorcemos", "almorcéis", "almuercen"),
  },

  // ── e→i 詞幹變化（-ir，跟 pedir 同一組）──
  servir: {
    presente: six("sirvo", "sirves", "sirve", "servimos", "servís", "sirven"),
    preteritoIndefinido: six("serví", "serviste", "sirvió", "servimos", "servisteis", "sirvieron"),
    subjuntivoPresente: six("sirva", "sirvas", "sirva", "sirvamos", "sirváis", "sirvan"),
    gerundio: "sirviendo",
  },
  repetir: {
    presente: six("repito", "repites", "repite", "repetimos", "repetís", "repiten"),
    preteritoIndefinido: six("repetí", "repetiste", "repitió", "repetimos", "repetisteis", "repitieron"),
    subjuntivoPresente: six("repita", "repitas", "repita", "repitamos", "repitáis", "repitan"),
    gerundio: "repitiendo",
  },

  // ── 常見反身動詞的「原形」（despertar/acostar/vestir 本身也能單獨使用，
  //    例如 despertar a alguien＝叫醒某人；加上 se 變成反身用法時，
  //    由 verbEngine.js 的 resolveVerb() 拆出 baseInfinitive 後直接沿用這裡的變位規則） ──
  despertar: {
    presente: six("despierto", "despiertas", "despierta", "despertamos", "despertáis", "despiertan"),
    preteritoIndefinido: six("desperté", "despertaste", "despertó", "despertamos", "despertasteis", "despertaron"),
    subjuntivoPresente: six("despierte", "despiertes", "despierte", "despertemos", "despertéis", "despierten"),
  },
  acostar: {
    presente: six("acuesto", "acuestas", "acuesta", "acostamos", "acostáis", "acuestan"),
    preteritoIndefinido: six("acosté", "acostaste", "acostó", "acostamos", "acostasteis", "acostaron"),
    subjuntivoPresente: six("acueste", "acuestes", "acueste", "acostemos", "acostéis", "acuesten"),
  },
  vestir: {
    presente: six("visto", "vistes", "viste", "vestimos", "vestís", "visten"),
    preteritoIndefinido: six("vestí", "vestiste", "vistió", "vestimos", "vestisteis", "vistieron"),
    subjuntivoPresente: six("vista", "vistas", "vista", "vistamos", "vistáis", "vistan"),
    gerundio: "vistiendo",
  },
};
