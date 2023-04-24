# <img src="public/icons/droplet_64.png" width="45" align="left"> dert.gg

### Fantastik dertler nelerdir, nasıl sikilirler?

Ekşi Sözlük'te daha eğlenceli zaman geçirmeye hazır mısın? Fantastik dertlerin peşinde olanlar için dert.gg Chrome eklentisi, Ekşi Sözlük kullanıcılarına, gönderilere "derdini sikeyim" butonu ile mizahi ve eğlenceli tepkiler verme imkanı sunar. Aynı zamanda herhangi bir başlık altında diğer kullanıcıların keşfettiği fantastik dertleri de canlı olarak takip etmeye olanak verir. Kim bilir belki senin derdin daha fantastiktir?

dert.gg, Ekşi Sözlük gönderilerine dikkat çekici bir alternatif tepki sunarak platformda geçirdiğin zamanı daha keyifli hale getirir ve fantastik dertlerin nasıl sikileceğini gösterir. Eklentiyi hızlı ve kolay bir şekilde kurarak, Ekşi Sözlük macerana ekstra eğlence ve renk katmaya başla.

Neden bekliyorsun? Hemen dert.gg Chrome eklentisini indir, arkadaşlarınla paylaş ve Ekşi Sözlük'te gönderilere verdiğin eğlenceli tepkilerle herkesi şaşırt! Fantastik dertlerin dünyasına adım at ve onları nerede bulabileceğini keşfet!

### Nedir?

Kısaca özetlemek gerekirse Ekşi Sözlük'e hakkında sayfalarca entry girilen "derdini sikeyim butonu"nu eklemeye yarayan bir eklentidir. Kullanıcılar eş zamanlı olarak diğer kullanıcıların siktikleri dertleri de görebilirler.

### Nasıl Çalışır?

Eklentinin çok bir fonksiyonu yok. Tamamen bir MVP diyebiliriz. Sadece Ekşi Sözlük'teki entryleri oylamanıza imkan verir. Bu sebeple çalışma prensibi de çok karışık değil.

Öncelikle eklenti ilk kurulduğunda ya da her Chrome açıldığında dert.gg ile bir WebSocket bağlantısı kurar. Bu sayede bulunduğunuz başlıklara ait entrylerin ilk oy sayılarını alırsınız.

dert.gg üzerinden bir hesap oluşturduktan ya da dert gg'ye giriş yaptıktan sonra Chrome Runtime API ile eklenti ID'sini kullanarak eklentiye kullanıcıya ait bir JWT gönderiyoruz. Daha sonra bu JWT Chrome local storage'da tutuluyor ve bu JWT'yi kullanarak kurmuş olduğumuz WS bağlantısı üzerinden "upvote" ya da "unvote" komutları gönderiyoruz.

![How the extension communicates with the backend](https://raw.githubusercontent.com/dert-gg/dert-gg-extension/main/how_it_works.png)

---

This project was bootstrapped with [Chrome Extension CLI](https://github.com/dutiyesh/chrome-extension-cli)

