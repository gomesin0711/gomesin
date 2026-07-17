import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Real industrial machine photos (from z-ai image-search, OSS-hosted & embeddable)
const IMG: Record<string, string[]> = {
  cetak: [
    "https://sfile.chatglm.cn/images-ppt/fb5900ead8d4.png",
    "https://sfile.chatglm.cn/images-ppt/6c1ec000c4c4.jpg",
    "https://sfile.chatglm.cn/images-ppt/97feab0e1d60.jpg",
    "https://sfile.chatglm.cn/images-ppt/4d86781b141e.jpg",
    "https://sfile.chatglm.cn/images-ppt/d52710e49f50.jpg",
    "https://sfile.chatglm.cn/images-ppt/feb5430b6023.jpg",
  ],
  cnc: [
    "https://sfile.chatglm.cn/images-ppt/dae3b28e3c96.jpg",
    "https://sfile.chatglm.cn/images-ppt/da22686eb77b.jpg",
    "https://sfile.chatglm.cn/images-ppt/79edc440b790.jpg",
    "https://sfile.chatglm.cn/images-ppt/b7631b67e5b2.png",
    "https://sfile.chatglm.cn/images-ppt/46336afcc832.webp",
    "https://sfile.chatglm.cn/images-ppt/c66b63ef4400.jpg",
  ],
  laser: [
    "https://sfile.chatglm.cn/images-ppt/e8e7aacd4324.jpg",
    "https://sfile.chatglm.cn/images-ppt/d4f8bb61ba5a.jpg",
    "https://sfile.chatglm.cn/images-ppt/e4af210cce77.webp",
    "https://sfile.chatglm.cn/images-ppt/9ef9dd58c181.jpg",
    "https://sfile.chatglm.cn/images-ppt/7817bdcd1fc9.jpg",
    "https://sfile.chatglm.cn/images-ppt/abaa6f9c8156.jpg",
  ],
  makanan: [
    "https://sfile.chatglm.cn/images-ppt/148ce889ab71.jpg",
    "https://sfile.chatglm.cn/images-ppt/3dd843ea721f.png",
    "https://sfile.chatglm.cn/images-ppt/2ad70741b333.jpg",
    "https://sfile.chatglm.cn/images-ppt/3c3fe94af52c.jpg",
    "https://sfile.chatglm.cn/images-ppt/b48c290d611e.jpg",
    "https://sfile.chatglm.cn/images-ppt/b847769dd2f9.jpg",
  ],
  kayu: [
    "https://sfile.chatglm.cn/images-ppt/ca23a9c6930a.jpg",
    "https://sfile.chatglm.cn/images-ppt/97ee01e086a2.jpg",
    "https://sfile.chatglm.cn/images-ppt/4c307e97acd5.jpg",
    "https://sfile.chatglm.cn/images-ppt/32b959cb9018.jpg",
    "https://sfile.chatglm.cn/images-ppt/6cccfb1324ed.jpg",
    "https://sfile.chatglm.cn/images-ppt/e4ba003140a0.jpg",
  ],
  plastik: [
    "https://sfile.chatglm.cn/images-ppt/17736d2412bd.jpg",
    "https://sfile.chatglm.cn/images-ppt/b83dc521bb79.jpg",
    "https://sfile.chatglm.cn/images-ppt/72c445c3dc8b.jpg",
    "https://sfile.chatglm.cn/images-ppt/ae4fb8e9c30c.png",
    "https://sfile.chatglm.cn/images-ppt/4128baae3e0c.jpg",
    "https://sfile.chatglm.cn/images-ppt/c6cafcd8460f.png",
  ],
  kompressor: [
    "https://sfile.chatglm.cn/images-ppt/3b64863fa410.webp",
    "https://sfile.chatglm.cn/images-ppt/f6a676757fdc.jpg",
    "https://sfile.chatglm.cn/images-ppt/57d050941c76.jpg",
    "https://sfile.chatglm.cn/images-ppt/8fbc8a636c3f.jpg",
    "https://sfile.chatglm.cn/images-ppt/f6151a22ca0b.jpg",
    "https://sfile.chatglm.cn/images-ppt/57f8e2b23e11.jpg",
  ],
  tekstil: [
    "https://sfile.chatglm.cn/images-ppt/3ce34138cab3.png",
    "https://sfile.chatglm.cn/images-ppt/f1251dd939b5.png",
    "https://sfile.chatglm.cn/images-ppt/105817c75ef1.jpg",
    "https://sfile.chatglm.cn/images-ppt/13a64d2f3313.jpg",
    "https://sfile.chatglm.cn/images-ppt/ce8f28181713.jpg",
    "https://sfile.chatglm.cn/images-ppt/23e14a62e947.png",
  ],
  kemasan: [
    "https://sfile.chatglm.cn/images-ppt/d8b0a80017c3.jpg",
    "https://sfile.chatglm.cn/images-ppt/41186e322d01.jpg",
    "https://sfile.chatglm.cn/images-ppt/7f7cac4bf47c.jpg",
    "https://sfile.chatglm.cn/images-ppt/a9c0f1b3ae0e.jpg",
    "https://sfile.chatglm.cn/images-ppt/6a2b8896207e.jpg",
    "https://sfile.chatglm.cn/images-ppt/85e776115488.jpg",
  ],
  konstruksi: [
    "https://sfile.chatglm.cn/images-ppt/b4797532c807.jpg",
    "https://sfile.chatglm.cn/images-ppt/33ae671116aa.jpg",
    "https://sfile.chatglm.cn/images-ppt/a5abdd3178ca.jpg",
    "https://sfile.chatglm.cn/images-ppt/aa709c161071.jpg",
    "https://sfile.chatglm.cn/images-ppt/ded11e42ea74.jpg",
    "https://sfile.chatglm.cn/images-ppt/339dc4210195.jpg",
  ],
  bubut: [
    "https://sfile.chatglm.cn/images-ppt/6c351023fccd.webp",
    "https://sfile.chatglm.cn/images-ppt/5142390d962b.jpg",
    "https://sfile.chatglm.cn/images-ppt/65e2cc4d796e.jpg",
    "https://sfile.chatglm.cn/images-ppt/1af355ea119f.jpg",
    "https://sfile.chatglm.cn/images-ppt/4f8f849a1d41.jpg",
    "https://sfile.chatglm.cn/images-ppt/3ce3e84dc618.jpg",
    "https://sfile.chatglm.cn/images-ppt/404134fef2c2.webp",
    "https://sfile.chatglm.cn/images-ppt/f08a7789a0d0.jpg",
  ],
  digitalprint: [
    "https://sfile.chatglm.cn/images-ppt/5234e589393b.jpg",
    "https://sfile.chatglm.cn/images-ppt/5292ff231177.jpg",
    "https://sfile.chatglm.cn/images-ppt/b576ad56e0c6.jpg",
    "https://sfile.chatglm.cn/images-ppt/4ba881faf6f4.jpg",
    "https://sfile.chatglm.cn/images-ppt/c1cce7774031.png",
    "https://sfile.chatglm.cn/images-ppt/0b4d980eed37.jpg",
  ],
};

const categories = [
  { name: "Mesin Cetak", slug: "mesin-cetak", icon: "Printer", color: "emerald", sortOrder: 1 },
  { name: "Mesin Digital Printing", slug: "mesin-digital-printing", icon: "MonitorPrinter", color: "teal", sortOrder: 2 },
  { name: "Mesin Kemasan & Packaging", slug: "mesin-kemasan", icon: "Package", color: "green", sortOrder: 3 },
  { name: "Mesin Plastik & Injeksi", slug: "mesin-plastik", icon: "FlaskConical", color: "emerald", sortOrder: 4 },
  { name: "Kompressor & Generator", slug: "kompressor-generator", icon: "Zap", color: "teal", sortOrder: 5 },
  { name: "Mesin CNC & Laser", slug: "mesin-cnc-laser", icon: "Cog", color: "teal", sortOrder: 6 },
  { name: "Mesin Bubut", slug: "mesin-bubut", icon: "Disc3", color: "green", sortOrder: 7 },
  { name: "Mesin Makanan & Minuman", slug: "mesin-makanan", icon: "CookingPot", color: "green", sortOrder: 8 },
  { name: "Mesin Tekstil & Garment", slug: "mesin-tekstil", icon: "Shirt", color: "lime", sortOrder: 9 },
  { name: "Mesin Kayu & Perkakas", slug: "mesin-kayu", icon: "TreePine", color: "lime", sortOrder: 10 },
  { name: "Alat Berat & Konstruksi", slug: "alat-berat", icon: "Truck", color: "emerald", sortOrder: 11 },
  { name: "Sparepart & Aksesoris", slug: "sparepart", icon: "Wrench", color: "teal", sortOrder: 12 },
];

const sellers = [
  { name: "CV. Mesindo Mandiri", phone: "0812-3456-7890", city: "Surabaya", province: "Jawa Timur", verified: true, rating: 4.8, reviewCount: 124 },
  { name: "PT. Karya Teknik Sukses", phone: "0813-2200-1188", city: "Bekasi", province: "Jawa Barat", verified: true, rating: 4.7, reviewCount: 89 },
  { name: "Toko Mesin Jaya Abadi", phone: "0856-9090-1212", city: "Semarang", province: "Jawa Tengah", verified: true, rating: 4.6, reviewCount: 56 },
  { name: "Bengkel Las & Mesin Sejahtera", phone: "0878-3344-5566", city: "Tangerang", province: "Banten", verified: false, rating: 4.4, reviewCount: 31 },
  { name: "UD. Sumber Rezeki Mesin", phone: "0821-7788-9900", city: "Bandung", province: "Jawa Barat", verified: true, rating: 4.9, reviewCount: 142 },
  { name: "PT. Indoprint Engineering", phone: "0811-5566-7788", city: "Jakarta Selatan", province: "DKI Jakarta", verified: true, rating: 4.7, reviewCount: 77 },
  { name: "Mitramega Mesin Industri", phone: "0852-1234-5678", city: "Medan", province: "Sumatera Utara", verified: false, rating: 4.3, reviewCount: 24 },
  { name: "CV. Garuda Mesin", phone: "0838-6655-4433", city: "Surabaya", province: "Jawa Timur", verified: true, rating: 4.8, reviewCount: 98 },
];

type ListingSeed = {
  title: string;
  desc: string;
  price: number;
  priceType?: "fixed" | "negotiable";
  condition: "baru" | "bekas";
  brand?: string;
  year?: number;
  city: string;
  province: string;
  catSlug: string;
  imgKey: string;
  imgs: number[];
  specs: Record<string, string>;
  featured?: boolean;
  views?: number;
};

const L: ListingSeed[] = [
  // ===== Mesin Cetak =====
  {
    title: "Mesin Cetak Offset Heidelberg SM 52 4 Warna",
    desc: "Dijual mesin cetak offset Heidelberg Speedmaster SM 52-4 warna, kondisi sangat terawat. Selalu di-service berkala, hasil cetak rapi & register presisi. Cocok untuk percetakan komersial kelas menengah. Termasuk kelengkapan blanket, roller, dan sparepart standar. Alasan jual: upgrade kapasitas.",
    price: 1850000000, priceType: "negotiable", condition: "bekas", brand: "Heidelberg", year: 2012,
    city: "Surabaya", province: "Jawa Timur", catSlug: "mesin-cetak", imgKey: "cetak", imgs: [0, 1, 2],
    specs: { "Tipe": "Speedmaster SM 52-4", "Jumlah Warna": "4 Warna", "Max Ukuran Cetak": "520 x 740 mm", "Kecepatan": "13.000 lembar/jam", "Daya Listrik": "380V / 3 Phase", "Tahun": "2012" },
    featured: true, views: 1840,
  },
  {
    title: "Mesin Cetak Digital Konika Minolta C3080",
    desc: "Mesin cetak digital production print Konica Minolta C3080, jam cetak rendah ~350rb. Warna konsisten, cocok untuk digital printing & short run. Sudah kalibrasi color profile.",
    price: 275000000, condition: "bekas", brand: "Konica Minolta", year: 2019,
    city: "Bekasi", province: "Jawa Barat", catSlug: "mesin-cetak", imgKey: "cetak", imgs: [3, 4],
    specs: { "Tipe": "Bizhub C3080", "Kecepatan": "80 ppm", "Resolusi": "1200 x 1200 dpi", "Counter": "~350.000 click", "Daya": "220V" },
    featured: true, views: 920,
  },
  {
    title: "Mesin Cetak Sablon Flat Screen Manual + Vacuum",
    desc: "Mesin sablon flat screen 4 warna dengan meja vacuum, cocok untuk usaha sablon kaos skala UMKM. Frame alumunium, tekanan rata, mudah operasional.",
    price: 8500000, priceType: "fixed", condition: "baru",
    city: "Bandung", province: "Jawa Barat", catSlug: "mesin-cetak", imgKey: "cetak", imgs: [5],
    specs: { "Tipe": "Flat Screen 4 Warna", "Ukuran Meja": "50 x 70 cm", "Sistem": "Vacuum", "Garansi": "1 Tahun" },
    views: 410,
  },
  {
    title: "Mesin Cetak Label Flexo 3 Warna",
    desc: "Mesin flexo label 3 warna unwind/rewind otomatis, untuk label stiker & rolling paper. Kondisi siap pakai.",
    price: 145000000, condition: "bekas", brand: "Sino", year: 2017,
    city: "Semarang", province: "Jawa Tengah", catSlug: "mesin-cetak", imgKey: "cetak", imgs: [0, 2],
    specs: { "Tipe": "Flexo 3 Warna", "Lebar Cetak": "Max 280 mm", "Tension Control": "Otomatis", "Tahun": "2017" },
    views: 305,
  },

  // ===== Mesin Digital Printing =====
  {
    title: "Mesin Digital Printing Large Format Eco-Solvent 1.6m",
    desc: "Dijual mesin digital printing large format eco-solvent lebar 1.6 meter, kondisi prima. Cocok untuk cetak banner, spanduk, baliho, & sticker. Head print Epson DX5, warna vivi, hasil tajam. Sudah include heater & take-up reel.",
    price: 38500000, priceType: "negotiable", condition: "bekas", brand: "Roland", year: 2019,
    city: "Jakarta Selatan", province: "DKI Jakarta", catSlug: "mesin-digital-printing", imgKey: "digitalprint", imgs: [0, 1],
    specs: { "Tipe": "Eco-Solvent Large Format", "Lebar Cetak": "1.6 meter", "Head Print": "Epson DX5", "Resolusi": "1440 dpi", "Tahun": "2019" },
    featured: true, views: 1120,
  },
  {
    title: "Mesin UV Flatbed Printer 60x90cm A3+",
    desc: "Mesin UV flatbed printer A3+ untuk cetak langsung di acrylic, kayu, kaca, metal, phone case. Hasil tahan gores & UV. 6 warna + white. Cocok usaha custom gift & signage.",
    price: 65000000, priceType: "negotiable", condition: "baru", brand: "Mimaki",
    city: "Bekasi", province: "Jawa Barat", catSlug: "mesin-digital-printing", imgKey: "digitalprint", imgs: [2, 3],
    specs: { "Tipe": "UV Flatbed", "Area Cetak": "60 x 90 cm", "Warna": "6 Warna + White", "Daya": "220V", "Garansi": "1 Tahun" },
    featured: true, views: 780,
  },
  {
    title: "Mesin Sublimasi Tinta 1.8m + Heat Press",
    desc: "Mesin sublimasi tinta lebar 1.8m lengkap dengan heat press roll. Untuk produksi kaos, mug, kain, bendera. Hasil warna menyerap sempurna ke kain polyester.",
    price: 28500000, priceType: "fixed", condition: "baru", brand: "Epson",
    city: "Bandung", province: "Jawa Barat", catSlug: "mesin-digital-printing", imgKey: "digitalprint", imgs: [4],
    specs: { "Tipe": "Sublimasi Tinta", "Lebar": "1.8 meter", "Head": "Epson i3200", "Include": "Heat Press Roll" },
    views: 540,
  },
  {
    title: "Mesin Digital Printing Textile Direct-to-Garment (DTG)",
    desc: "Mesin DTG untuk cetak langsung di kaos cotton. Hasil detail & tahan lama. White + CMYK. Cocok produksi kaos custom small-medium volume.",
    price: 45000000, condition: "bekas", brand: "Brother", year: 2020,
    city: "Tangerang", province: "Banten", catSlug: "mesin-digital-printing", imgKey: "digitalprint", imgs: [5, 0],
    specs: { "Tipe": "DTG Direct-to-Garment", "Warna": "CMYK + White", "Merk": "Brother", "Tahun": "2020" },
    views: 360,
  },

  // ===== CNC & Laser =====
  {
    title: "Mesin CNC Router Woodworking 1325 3 Axis",
    desc: "CNC router 1300x2500mm 3 axis, spindle 4.5kW air cooled, untuk ukir kayu, MDF, akrilik. Sudah include software ArtCAM & control Mach3. Garansi 1 tahun.",
    price: 65000000, priceType: "negotiable", condition: "baru", brand: "Seo",
    city: "Tangerang", province: "Banten", catSlug: "mesin-cnc-laser", imgKey: "cnc", imgs: [0, 1],
    specs: { "Area Kerja": "1300 x 2500 mm", "Spindle": "4.5 kW Air Cooled", "Sumbu": "3 Axis", "Software": "Mach3 / ArtCAM", "Driver": "Yaskawa" },
    featured: true, views: 1530,
  },
  {
    title: "Mesin CNC Milling VMC 850 Second Import Jepang",
    desc: "Vertical Machining Center VMC 850 merk Fanuc, kondisi ex-import Jepang. Akurasi tinggi, cocok presisi part mould & automotive.",
    price: 485000000, condition: "bekas", brand: "Fanuc", year: 2015,
    city: "Bekasi", province: "Jawa Barat", catSlug: "mesin-cnc-laser", imgKey: "cnc", imgs: [2, 3],
    specs: { "Tipe": "VMC 850", "Controller": "Fanuc 0i-Mate", "Travel": "800x500x500 mm", "Spindle": "BT40 8000 rpm", "ATC": "24 Posisi" },
    featured: true, views: 780,
  },
  {
    title: "Mesin Laser Cutting CO2 1300x900 130W",
    desc: "Mesin laser cutting & engraving CO2 130W, area 1300x900mm. Untuk akrilik, kulit, kayu tipis, karet. Include chiller & exhaust blower.",
    price: 42500000, condition: "baru", brand: "Thunder Laser",
    city: "Bandung", province: "Jawa Barat", catSlug: "mesin-cnc-laser", imgKey: "laser", imgs: [0, 1, 2],
    specs: { "Tipe": "CO2 Laser 130W", "Area Kerja": "1300 x 900 mm", "Controller": "Ruida", "Chiller": "Include", "Software": "CorelDRAW/LightBurn" },
    featured: true, views: 1120,
  },
  {
    title: "Mesin Laser Fiber Marking 20W (Tanda Seri)",
    desc: "Laser marking fiber 20W untuk marking logam & tanda seri produk. Marking permanen, cepat, presisi. Cocok industri komponen.",
    price: 38500000, priceType: "fixed", condition: "baru",
    city: "Surabaya", province: "Jawa Timur", catSlug: "mesin-cnc-laser", imgKey: "laser", imgs: [3, 4],
    specs: { "Tipe": "Fiber Laser 20W", "Marking Area": "110 x 110 mm", "Lensa": "F-theta", "Daya": "20W" },
    views: 460,
  },

  // ===== Mesin Bubut =====
  {
    title: "Mesin Bubut Logam Conventional WD6150 1500mm Swing 500mm",
    desc: "Dijual mesin bubut logam konvensional WD6150, kondisi sangat terawat. Swing over bed 500mm, jarak antar pusat 1500mm. Cocok untuk bengkel umum, pembuatan parts, & reparasi. Sudah include chuck 3 jaw, center, steady rest, dan tool post. Alasan jual: pindah ke CNC.",
    price: 185000000, priceType: "negotiable", condition: "bekas", brand: "Weihai WD", year: 2018,
    city: "Surabaya", province: "Jawa Timur", catSlug: "mesin-bubut", imgKey: "bubut", imgs: [0, 1, 2],
    specs: { "Tipe": "WD6150 Conventional", "Swing Over Bed": "500 mm", "Jarak Antar Pusat": "1500 mm", "Spindle Bore": "82 mm", "Spindle Speed": "20-1800 rpm", "Daya Listrik": "5.5 kW / 380V", "Tahun": "2018" },
    featured: true, views: 1340,
  },
  {
    title: "Mesin Bubut CNC 2 Axis Slant Bed Mazak QT-200",
    desc: "Mesin bubut CNC slant bed Mazak QT-200, controller Mazatrol T-Plus. Kondisi ex-import Jepang, presisi tinggi untuk part otomotif & moulding. Sudah include chuck hidrolik & tailstock.",
    price: 425000000, priceType: "negotiable", condition: "bekas", brand: "Mazak", year: 2015,
    city: "Bekasi", province: "Jawa Barat", catSlug: "mesin-bubut", imgKey: "bubut", imgs: [3, 4],
    specs: { "Tipe": "QT-200 Slant Bed CNC", "Controller": "Mazatrol T-Plus", "Swing": "350 mm", "Jarak Antar Pusat": "500 mm", "Chuck": "8 inch Hidrolik", "Tahun": "2015" },
    featured: true, views: 980,
  },
  {
    title: "Mesin Bubut Mini Table Top 180x300 (Bench Lathe)",
    desc: "Mesin bubut mini bench lathe 180mm swing x 300mm jarak pusat. Cocok untuk hobby, workshop kecil, sekolah, & R&D. Motor 550W, variable speed. Sudah termasuk chuck 3 jaw & tool set.",
    price: 8500000, priceType: "fixed", condition: "baru", brand: "Sieg",
    city: "Bandung", province: "Jawa Barat", catSlug: "mesin-bubut", imgKey: "bubut", imgs: [5],
    specs: { "Tipe": "Mini Bench Lathe C2", "Swing": "180 mm", "Jarak Antar Pusat": "300 mm", "Motor": "550W", "Spindle Speed": "50-2500 rpm", "Daya": "220V" },
    views: 620,
  },
  {
    title: "Mesin Bubut Kayu Copy Lathe CNC 2 Kepala",
    desc: "Mesin bubut kayu copy lathe CNC 2 kepala, untuk produksi pegangan tangga, meja, & furniture massal. Bisa copy pola otomatis, output halus & konsisten.",
    price: 28500000, priceType: "negotiable", condition: "baru",
    city: "Jepara", province: "Jawa Tengah", catSlug: "mesin-bubut", imgKey: "bubut", imgs: [6, 7],
    specs: { "Tipe": "Copy Lathe CNC 2 Kepala", "Panjang Max": "1500 mm", "Motor": "2.2 kW", "Sistem": "Copy Otomatis" },
    views: 410,
  },
  {
    title: "Mesin Bubut Logam WM210V 210x400 Variable Speed",
    desc: "Mesin bubut logam WM210V, swing 210mm jarak pusat 400mm, variable speed dengan inverter. Cocok untuk bengkel presisi & UMKM manufaktur. Kelengkapan chuck 3 & 4 jaw, dead center, tool post.",
    price: 22500000, priceType: "fixed", condition: "baru", brand: "Weiss",
    city: "Tangerang", province: "Banten", catSlug: "mesin-bubut", imgKey: "bubut", imgs: [1, 0],
    specs: { "Tipe": "WM210V Variable Speed", "Swing": "210 mm", "Jarak Antar Pusat": "400 mm", "Spindle Speed": "50-2000 rpm", "Inverter": "Ada", "Daya": "750W / 220V" },
    featured: true, views: 870,
  },
  {
    title: "Mesin Bubut Konvensional TS-1280 Swing 320mm (Second)",
    desc: "Mesin bubut TS-1280 kondisi second masih mulus, swing 320mm jarak pusat 800mm. Cocok bengkel umum & fabrikasi. Sudah kalibrasi, siap pakai.",
    price: 42500000, condition: "bekas", brand: "Takisawa", year: 2017,
    city: "Semarang", province: "Jawa Tengah", catSlug: "mesin-bubut", imgKey: "bubut", imgs: [2, 4],
    specs: { "Tipe": "TS-1280 Conventional", "Swing": "320 mm", "Jarak Antar Pusat": "800 mm", "Spindle Bore": "52 mm", "Tahun": "2017" },
    views: 340,
  },

  // ===== Mesin Kayu =====
  {
    title: "Mesin Table Saw Sliding 3000mm + Scoring",
    desc: "Table saw sliding panel saw 3000mm dengan pisau scoring, motor utama 5.5kW. Potongan presisi untuk furniture & dapur.",
    price: 52000000, priceType: "negotiable", condition: "baru", brand: "Wood Tec",
    city: "Semarang", province: "Jawa Tengah", catSlug: "mesin-kayu", imgKey: "kayu", imgs: [0, 1],
    specs: { "Panjang Sliding": "3000 mm", "Motor Utama": "5.5 kW", "Scoring Blade": "Ada", "Tegangan": "380V 3 Phase" },
    featured: true, views: 880,
  },
  {
    title: "Mesin Planner Thicknesser 20 Inch 3 in 1",
    desc: "Mesin kayu 3 in 1: surface planer + thicknesser + jointer lebar 20 inch. Motor 5HP, kondisi mulus.",
    price: 32500000, condition: "bekas", brand: "Robland", year: 2018,
    city: "Bandung", province: "Jawa Barat", catSlug: "mesin-kayu", imgKey: "kayu", imgs: [2],
    specs: { "Lebar": "20 inch", "Fungsi": "3 in 1", "Motor": "5 HP", "Tahun": "2018" },
    views: 340,
  },
  {
    title: "Mesin Bubut Kayu Copy Lathe CNC",
    desc: "Mesin bubut kayu copy lathe CNC untuk pegangan tangga, meja, furniture. Bisa copy pola otomatis.",
    price: 28500000, condition: "baru",
    city: "Jepara", province: "Jawa Tengah", catSlug: "mesin-kayu", imgKey: "kayu", imgs: [3, 4],
    specs: { "Tipe": "Copy Lathe CNC", "Panjang": "Max 1500 mm", "Motor": "2.2 kW" },
    views: 250,
  },

  // ===== Mesin Makanan =====
  {
    title: "Mesin Penggiling Daging (Meat Mincer) 22mm Industrial",
    desc: "Penggiling daging stainless steel kapasitas 250kg/jam, pisau ganda. Cocok untuk industri sosis, bakso, abon.",
    price: 15500000, priceType: "fixed", condition: "baru", brand: "Sirman",
    city: "Surabaya", province: "Jawa Timur", catSlug: "mesin-makanan", imgKey: "makanan", imgs: [0, 1],
    specs: { "Kapasitas": "250 kg/jam", "Material": "Stainless Steel", "Motor": "1.5 kW", "Pisau": "Ganda" },
    featured: true, views: 670,
  },
  {
    title: "Mesin Mixer Adonan Roti Spiral 25kg",
    desc: "Mixer spiral 25kg kapasitas, untuk roti & kue. Bejana stainless, motor kuat, operasi halus.",
    price: 22500000, condition: "baru", brand: "Mecnosud",
    city: "Tangerang", province: "Banten", catSlug: "mesin-makanan", imgKey: "makanan", imgs: [2],
    specs: { "Kapasitas": "25 kg adonan", "Tipe": "Spiral", "Motor": "3 HP", "Material": "Stainless" },
    views: 410,
  },
  {
    title: "Mesin Fryer Gas Kapasitas 50L (Goreng Otomatis)",
    desc: "Deep fryer gas 50 liter dengan thermostat & basket lifter otomatis. Cocok industri kripik, kerupuk, gorengan kemasan.",
    price: 18500000, priceType: "negotiable", condition: "baru",
    city: "Semarang", province: "Jawa Tengah", catSlug: "mesin-makanan", imgKey: "makanan", imgs: [3, 4],
    specs: { "Kapasitas": "50 Liter", "Pemanas": "Gas LPG", "Thermostat": "Otomatis", "Material": "Stainless SS304" },
    views: 360,
  },
  {
    title: "Mesin Pasteurizer Susu 200L Stainless",
    desc: "Mesin pasteurisasi susu 200L jacketed vessel dengan steam/panas listrik, kontrol suhu presisi. Untuk UMKM olahan susu.",
    price: 95000000, condition: "baru",
    city: "Bandung", province: "Jawa Barat", catSlug: "mesin-makanan", imgKey: "makanan", imgs: [5],
    specs: { "Kapasitas": "200 L", "Pemanas": "Steam/Listrik", "Kontrol": "PLC Suhu", "Material": "SS316" },
    views: 180,
  },

  // ===== Plastik & Injeksi =====
  {
    title: "Mesin Injection Molding 150 Ton Bekas",
    desc: "Mesin injeksi plastik 150 ton clamping force, plastikator 380mm. Kondisi produksi, siap pindah. Cocok untuk household & fitting.",
    price: 285000000, priceType: "negotiable", condition: "bekas", brand: "Haitian", year: 2016,
    city: "Bekasi", province: "Jawa Barat", catSlug: "mesin-plastik", imgKey: "plastik", imgs: [0, 1],
    specs: { "Clamping Force": "150 Ton", "Shot Weight": "480 g", "Screw Dia": "60 mm", "Tahun": "2016" },
    featured: true, views: 990,
  },
  {
    title: "Mesin Extruder Pipa PVC 65mm",
    desc: "Mesin extruder pipa PVC twin screw 65mm, lengkap dengan calibration & cutter. Output pipa 1/2 - 4 inch.",
    price: 365000000, condition: "bekas", brand: "KraussMaffei", year: 2014,
    city: "Surabaya", province: "Jawa Timur", catSlug: "mesin-plastik", imgKey: "plastik", imgs: [2, 3],
    specs: { "Tipe": "Twin Screw 65mm", "Output": "Pipa 1/2 - 4 inch", "Tahun": "2014", "Daya": "55 kW" },
    views: 290,
  },
  {
    title: "Mesin Blow Molding Botol 5L",
    desc: "Mesin blow molding botol 5 liter single station, untuk galon & jirigen. Kondisi baik.",
    price: 175000000, condition: "bekas", year: 2018,
    city: "Tangerang", province: "Banten", catSlug: "mesin-plastik", imgKey: "plastik", imgs: [4, 5],
    specs: { "Tipe": "Single Station", "Volume": "Max 5 L", "Tahun": "2018" },
    views: 210,
  },

  // ===== Kompressor & Generator =====
  {
    title: "Air Compressor Screw 30 HP Atlas Copco",
    desc: "Kompressor angin screw 30 HP Atlas Copco, tekanan 10 bar, rendah noise. Include dryer & tank 500L. Siap pakai.",
    price: 95000000, priceType: "negotiable", condition: "bekas", brand: "Atlas Copco", year: 2019,
    city: "Cikarang", province: "Jawa Barat", catSlug: "kompressor-generator", imgKey: "kompressor", imgs: [0, 1],
    specs: { "Tipe": "Screw 30 HP", "Tekanan": "10 bar", "Tank": "500 L", "Tahun": "2019", "Noise": "Rendah" },
    featured: true, views: 760,
  },
  {
    title: "Generator Set Perkins 100 kVA Silent",
    desc: "Genset Perkins 100 kVA silent type canopy, engine Perkins + alternator Stamford. ATS ready. Garansi service.",
    price: 185000000, condition: "baru", brand: "Perkins",
    city: "Jakarta Selatan", province: "DKI Jakarta", catSlug: "kompressor-generator", imgKey: "kompressor", imgs: [2, 3],
    specs: { "Daya": "100 kVA", "Engine": "Perkins", "Alternator": "Stamford", "Tipe": "Silent Canopy", "ATS": "Optional" },
    featured: true, views: 540,
  },
  {
    title: "Kompressor Piston 10 HP Twin Tank",
    desc: "Kompressor piston 10 HP dua tabung 200L, untuk bengkel & industri kecil. Mudah maintenance.",
    price: 18500000, priceType: "fixed", condition: "baru",
    city: "Bandung", province: "Jawa Barat", catSlug: "kompressor-generator", imgKey: "kompressor", imgs: [4, 5],
    specs: { "Tipe": "Piston 10 HP", "Tank": "2 x 200 L", "Tekanan": "8 bar" },
    views: 320,
  },

  // ===== Tekstil & Garment =====
  {
    title: "Mesin Jahit industri Juki DDL-8700 (1 Jarum)",
    desc: "Mesin jahit lockstitch Juki DDL-8700, kondisi prima, untuk jahit busana & garment. Motor servo hemat listrik.",
    price: 6500000, priceType: "fixed", condition: "baru", brand: "Juki",
    city: "Bandung", province: "Jawa Barat", catSlug: "mesin-tekstil", imgKey: "tekstil", imgs: [0, 1],
    specs: { "Tipe": "DDL-8700 Lockstitch", "Motor": "Servo 550W", "Kecepatan": "5.000 SPM", "Merk": "Juki" },
    featured: true, views: 880,
  },
  {
    title: "Mesin Overlock 4 Benang Brother",
    desc: "Overlock 4 benang untuk kelim rajutan & woven. Kondisi second mulus, siap produksi.",
    price: 4850000, condition: "bekas", brand: "Brother", year: 2020,
    city: "Tangerang", province: "Banten", catSlug: "mesin-tekstil", imgKey: "tekstil", imgs: [2],
    specs: { "Tipe": "Overlock 4 Benang", "Merk": "Brother", "Tahun": "2020" },
    views: 230,
  },
  {
    title: "Mesin Bordir Komputer 6 Kepala 15 Jarum",
    desc: "Mesin bordir komputer 6 kepala 15 jarum, memory pattern, untuk bordir logo kaos & cap. Include software.",
    price: 145000000, priceType: "negotiable", condition: "baru", brand: "Tajima",
    city: "Semarang", province: "Jawa Tengah", catSlug: "mesin-tekstil", imgKey: "tekstil", imgs: [3, 4],
    specs: { "Kepala": "6", "Jarum": "15", "Area Bordir": "400x450 mm", "Merk": "Tajima" },
    featured: true, views: 410,
  },

  // ===== Kemasan / Packaging =====
  {
    title: "Mesin Packaging Sealer Otomatis Continuous",
    desc: "Mesin sealer continuous horizontal untuk kemasan pouch & karton. Tanggal produksi otomatis (coding).",
    price: 18500000, condition: "baru",
    city: "Surabaya", province: "Jawa Timur", catSlug: "mesin-kemasan", imgKey: "kemasan", imgs: [0, 1],
    specs: { "Tipe": "Continuous Sealer", "Lebar Seal": "Max 10 mm", "Coding": "Otomatis", "Konveyor": "Include" },
    featured: true, views: 520,
  },
  {
    title: "Mesin Filling & Capping Botol Otomatis 6 Nozzle",
    desc: "Mesin isi botol cair 6 nozzle + capping otomatis, untuk sirup, minuman, kosmetik. Stainless food grade.",
    price: 125000000, priceType: "negotiable", condition: "baru",
    city: "Bekasi", province: "Jawa Barat", catSlug: "mesin-kemasan", imgKey: "kemasan", imgs: [2, 3],
    specs: { "Nozzle": "6", "Kapasitas": "30-40 botol/menit", "Material": "SS304", "Fungsi": "Filling + Capping" },
    views: 280,
  },
  {
    title: "Mesin Shrink Wrap Tunnel L Sealer",
    desc: "Mesin shrink wrap L sealer + tunnel, untuk kemasan plastik shrink multibox. Konveyor otomatis.",
    price: 45000000, condition: "baru",
    city: "Tangerang", province: "Banten", catSlug: "mesin-kemasan", imgKey: "kemasan", imgs: [4, 5],
    specs: { "Tipe": "L Sealer + Tunnel", "Ukuran": "Max 500x400 mm", "Daya": "12 kW" },
    views: 190,
  },

  // ===== Alat Berat & Konstruksi =====
  {
    title: "Excavator Komatsu PC200-8 Bekas",
    desc: "Excavator Komatsu PC200-8, jam operasi 6.500 H. Unit terawat, siap kerja. Undercarriage 70%. Surat lengkap.",
    price: 785000000, priceType: "negotiable", condition: "bekas", brand: "Komatsu", year: 2013,
    city: "Balikpapan", province: "Kalimantan Timur", catSlug: "alat-berat", imgKey: "konstruksi", imgs: [0, 1],
    specs: { "Tipe": "PC200-8", "Jam Operasi": "6.500 H", "Berat": "20 Ton", "Tahun": "2013", "Undercarriage": "70%" },
    featured: true, views: 1340,
  },
  {
    title: "Forklift Toyota 3 Ton Diesel",
    desc: "Forklift Toyota 3 ton diesel, mast 4 meter, kondisi siap pakai. Untuk gudang & pabrik.",
    price: 185000000, condition: "bekas", brand: "Toyota", year: 2015,
    city: "Surabaya", province: "Jawa Timur", catSlug: "alat-berat", imgKey: "konstruksi", imgs: [2, 3],
    specs: { "Kapasitas": "3 Ton", "Mast": "4 Meter", "Bahan Bakar": "Diesel", "Tahun": "2015" },
    featured: true, views: 620,
  },
  {
    title: "Concrete Mixer 350L Diesel Engine",
    desc: "Mixer beton 350L mesin diesel, untuk proyek konstruksi skala menengah. Drum tebal, roda angkut.",
    price: 12500000, priceType: "fixed", condition: "baru",
    city: "Bandung", province: "Jawa Barat", catSlug: "alat-berat", imgKey: "konstruksi", imgs: [4, 5],
    specs: { "Kapasitas": "350 L", "Engine": "Diesel 6 HP", "Drum": "Tebal 4mm" },
    views: 290,
  },

  // ===== Sparepart & Aksesoris =====
  {
    title: "Pisau CNC V-Bit Set 10pcs (Hard Carbide)",
    desc: "Set pisau CNC V-bit carbide 10pcs ukuran assorted, untuk ukiran kayu & akrilik presisi.",
    price: 1250000, priceType: "fixed", condition: "baru",
    city: "Jakarta Selatan", province: "DKI Jakarta", catSlug: "sparepart", imgKey: "cnc", imgs: [5],
    specs: { "Isi": "10 pcs", "Material": "Carbide", "Tipe": "V-Bit 60/90 derajat" },
    views: 480,
  },
  {
    title: "Sparepart Roller Offset Heidelberg (Set)",
    desc: "Set roller distribusi & dampening untuk Heidelberg SM 52, kondisi masih tebal. Original.",
    price: 18500000, priceType: "negotiable", condition: "bekas",
    city: "Surabaya", province: "Jawa Timur", catSlug: "sparepart", imgKey: "cetak", imgs: [4, 5],
    specs: { "Kompatibilitas": "Heidelberg SM 52", "Kondisi": "Tebal", "Tipe": "Set Roller" },
    views: 150,
  },
  {
    title: "Filter Oli Kompressor Atlas Copco (Original)",
    desc: "Filter oli & elemen udara original Atlas Copco untuk kompressor screw 30-50 HP. Stok ready.",
    price: 1850000, condition: "baru",
    city: "Cikarang", province: "Jawa Barat", catSlug: "sparepart", imgKey: "kompressor", imgs: [5],
    specs: { "Kompatibilitas": "Atlas Copco 30-50 HP", "Tipe": "Filter Oli + Elemen", "Original": "Ya" },
    views: 220,
  },
  {
    title: "Nozzle Mesin Injeksi Plastik (Universal)",
    desc: "Nozzle & tip mesin injeksi plastik universal, bahan tungsten, tahan panas. Berbagai ukuran.",
    price: 2850000, condition: "baru",
    city: "Bekasi", province: "Jawa Barat", catSlug: "sparepart", imgKey: "plastik", imgs: [5],
    specs: { "Material": "Tungsten", "Tipe": "Universal", "Ukuran": "Assorted" },
    views: 95,
  },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function main() {
  console.log("Seeding Gomesin...");

  // wipe
  await db.listing.deleteMany();
  await db.seller.deleteMany();
  await db.category.deleteMany();

  const catMap: Record<string, { id: string }> = {};
  for (const c of categories) {
    const created = await db.category.create({ data: { name: c.name, slug: c.slug, icon: c.icon, color: c.color, sortOrder: c.sortOrder } });
    catMap[c.slug] = { id: created.id };
  }

  const sellerMap: Record<string, { id: string }> = {};
  for (const s of sellers) {
    const created = await db.seller.create({
      data: {
        name: s.name,
        phone: s.phone,
        city: s.city,
        province: s.province,
        verified: s.verified,
        rating: s.rating,
        reviewCount: s.reviewCount,
      },
    });
    sellerMap[s.name] = { id: created.id };
  }

  let count = 0;
  for (const item of L) {
    const cat = catMap[item.catSlug];
    if (!cat) continue;
    // pick seller based on city match, fallback rotate
    const seller = sellers.find((s) => s.city === item.city) ?? sellers[count % sellers.length];
    const sellerId = sellerMap[seller.name].id;
    const images = item.imgs.map((i) => IMG[item.imgKey][i]).filter(Boolean);

    await db.listing.create({
      data: {
        title: item.title,
        slug: slugify(item.title) + "-" + Math.random().toString(36).slice(2, 7),
        description: item.desc,
        price: item.price,
        priceType: item.priceType ?? "fixed",
        condition: item.condition,
        brand: item.brand ?? null,
        yearProduced: item.year ?? null,
        city: item.city,
        province: item.province,
        images: JSON.stringify(images),
        specs: JSON.stringify(item.specs),
        featured: item.featured ?? false,
        views: item.views ?? Math.floor(Math.random() * 300),
        status: "active",
        paymentStatus: "paid",
        paymentExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        categoryId: cat.id,
        sellerId,
      },
    });
    count++;
  }

  console.log(`Seeded ${categories.length} categories, ${sellers.length} sellers, ${count} listings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
