-- TrendyMall real product content update
-- Run this after sql/004_seed_data.sql (which already ran against the live
-- database, so this is an additive UPDATE migration, not a re-seed).
-- Only name/price/stock/description/updated_at change — id, slug,
-- category_id, images, and is_active are left untouched.

update public.products
set
  name = 'AirPods Pro (2nd Generation)',
  price = 2500.00,
  stock = 100,
  description = $$Product details of high-quality wireless earbuds - AirPods Pro 2 (2nd generation)

- In-ear design for comfortable and secure fit
- Compatible with various devices
- Noise-cancellation feature for immersive audio experience
- Sleek and stylish design
- Comes with a charging case for convenience
- Model: Pro 2

Introducing the AirPods Pro 2 (2nd generation) In-Ear wireless headphones, the perfect audio accessory for those who demand high quality sound. These earbuds are designed to provide a comfortable and secure fit, making them perfect for use during workouts or while on the go. With their wireless design, you can enjoy your music without the hassle of tangled cords. The AirPods Pro 2 (2nd generation) are compatible with a wide range of devices, making them a versatile choice for any audio setup. Whether you're listening to music, watching movies, or taking calls, these earbuds deliver crystal-clear sound with deep bass and crisp highs. Upgrade your audio experience with the AirPods Pro 2 (2nd generation) In-Ear wireless headphones.$$,
  updated_at = now()
where slug = 'earbuds-airpods-pro-2';

update public.products
set
  name = 'KTS 1330 Portable Bluetooth Speaker with Wireless Mic',
  price = 5900.00,
  stock = 100,
  description = $$Product details of KTS 1330 Hi Quality Bluetooth Speaker with Wireless Microphone

- Brand Name: KTS
- Model: KTS-1330
- Use: Home theatre, Portable Audio Play, Mobile Phone, Karaoke Player, Computer, Stage, Outdoor
- Microphone: Yes
- Power Source: Battery
- Rechargeable: Yes
- Number of Loudspeaker Enclosure: 1 Woofer Size / Full-Range
- Material: Plastic
- Communication: AUX, USB
- PMPO: 20W
- Support Memory Card: Yes
- Speaker Type: Portable
- Output Power: 20W
- Frequency Range: 100Hz - 20kHz
- Built-in Microphone: Yes
- Speaker Style: 6.5 Inch
- Battery capacity: Rechargeable Li battery 1200mAh
- Accessories: USB cable x1, Wireless Microphone x1$$,
  updated_at = now()
where slug = 'speaker-kts-1330';

update public.products
set
  name = 'Apple MagSafe Battery Pack 5000mAh / 10000mAh Wireless Magnetic PowerBank',
  price = 3999.00,
  stock = 100,
  description = $$iPhone 12 සහ ඉහළ මොඩල් සඳහා පමණක් සුදුසුය. ඔබගේ දුරකථනය iPhone 12 ට වඩා පහළ නම් ඇණවුම නොකරන්න.
Only suitable for iPhone 12 and above. Do not order if your phone is below iPhone 12.

Introducing the Mini Power Bank 5000mAh Wireless Magnetic Portable Charger, a sleek and ultra-slim power solution for your on-the-go charging needs. Equipped with Apple interface compatibility, it offers seamless charging for iPhones and other devices. This portable charger boasts a robust 5000mAh Li-Polymer battery, delivering fast 18.5W wireless charging while protecting against over-charging, short circuits, and over-discharging. The compact design (95.8 x 64.1 x 11.3mm) and lightweight (250g) build make it perfect for outdoor use. Certified with CE, FCC, RoHS, MSDS, and UN38.3, it ensures safe and reliable performance.

- Up to 70% additional charge with iPhone 12 mini or iPhone 13 mini and MagSafe Battery Pack*
- Up to 60% additional charge with iPhone 12, iPhone 12 Pro, iPhone 13, iPhone 13 Pro, iPhone 14 or iPhone 14 Pro and MagSafe Battery Pack*
- Up to 40% additional charge with iPhone 12 Pro Max, iPhone 13 Pro Max, iPhone 14 Plus, or iPhone 14 Pro Max and MagSafe Battery Pack*$$,
  updated_at = now()
where slug = 'powerbank-magsafe-10000mah';

update public.products
set
  name = 'Marshall Major 4 IV',
  price = 2600.00,
  stock = 100,
  description = $$Marshall Major IV - A Grade High Quality. Same as original, worth for the price.

- Bluetooth
- Built-in microphone
- New Bluetooth version
- 5 hours play time
- Good sound bass
- Reliable for calls
- Reliable for games$$,
  updated_at = now()
where slug = 'headset-marshall-major-iv';
