import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "fr" | "en" | "ar";

const STORAGE_KEY = "achridz_lang";

const RTL_LANGS: Lang[] = ["ar"];

// Flat key -> { fr, en, ar } translation table for all static UI text.
const dict: Record<string, Record<Lang, string>> = {
  "app.tagline": { fr: "Le marché en ligne où tous les Algériens achètent et vendent, en toute confiance.", en: "The online marketplace where Algerians buy and sell with confidence.", ar: "السوق الإلكتروني الذي يبيع ويشتري فيه الجزائريون بثقة." },
  "app.subtitle": { fr: "Algeria Marketplace", en: "Algeria Marketplace", ar: "سوق الجزائر" },

  "nav.sell": { fr: "Déposer une annonce", en: "Post an ad", ar: "أضف إعلاناً" },
  "nav.login": { fr: "Se connecter", en: "Log in", ar: "تسجيل الدخول" },
  "nav.logout": { fr: "Se déconnecter", en: "Log out", ar: "تسجيل الخروج" },
  "nav.profile": { fr: "Mon profil", en: "My profile", ar: "ملفي الشخصي" },
  "nav.cart": { fr: "Mon panier", en: "My cart", ar: "سلتي" },
  "nav.favorites": { fr: "Mes favoris", en: "My favorites", ar: "المفضلة" },
  "nav.menu": { fr: "Menu", en: "Menu", ar: "القائمة" },
  "nav.language": { fr: "Langue", en: "Language", ar: "اللغة" },

  "search.placeholder": { fr: "Rechercher un produit, une marque...", en: "Search for a product, a brand...", ar: "ابحث عن منتج أو ماركة..." },
  "search.placeholder.short": { fr: "Rechercher...", en: "Search...", ar: "بحث..." },
  "search.button": { fr: "Rechercher", en: "Search", ar: "بحث" },

  "footer.section.brand": { fr: "Achri DZ", en: "Achri DZ", ar: "أشري دي زاد" },
  "footer.link.home": { fr: "Accueil", en: "Home", ar: "الرئيسية" },
  "footer.link.sell": { fr: "Déposer une annonce", en: "Post an ad", ar: "أضف إعلاناً" },
  "footer.link.all": { fr: "Toutes les annonces", en: "All listings", ar: "جميع الإعلانات" },
  "footer.section.categories": { fr: "Catégories", en: "Categories", ar: "الفئات" },
  "footer.section.help": { fr: "Aide", en: "Help", ar: "المساعدة" },
  "footer.help.trust": { fr: "Sécurité & confiance", en: "Safety & trust", ar: "الأمان والثقة" },
  "footer.help.delivery": { fr: "Livraison Yalidine Express", en: "Yalidine Express delivery", ar: "التوصيل عبر ياليدين إكسبرس" },
  "footer.help.contact": { fr: "Contact", en: "Contact", ar: "اتصل بنا" },
  "footer.madeWith": { fr: "Fait avec ❤️ en Algérie", en: "Made with ❤️ in Algeria", ar: "صُنع بحب ❤️ في الجزائر" },
  "footer.section.legal": { fr: "Informations", en: "Information", ar: "معلومات" },
  "footer.link.about": { fr: "À propos de nous", en: "About us", ar: "من نحن" },
  "footer.link.contact": { fr: "Contactez-nous", en: "Contact us", ar: "اتصل بنا" },
  "footer.link.faq": { fr: "Questions fréquentes", en: "FAQ", ar: "الأسئلة الشائعة" },
  "footer.link.terms": { fr: "Conditions d'utilisation", en: "Terms of use", ar: "شروط الاستخدام" },
  "footer.link.privacy": { fr: "Politique de confidentialité", en: "Privacy policy", ar: "سياسة الخصوصية" },

  "home.hero.title": { fr: "Achetez et vendez tout, partout en Algérie.", en: "Buy and sell anything, anywhere in Algeria.", ar: "بيع وشراء كل شيء، في كل ربوع الجزائر." },
  "home.hero.subtitle": { fr: "Des milliers d'annonces vérifiées dans les 58 wilayas. Trouvez une bonne affaire ou vendez en quelques minutes.", en: "Thousands of verified listings across all 58 wilayas. Find a great deal or sell in minutes.", ar: "آلاف الإعلانات الموثوقة في 58 ولاية. اعثر على صفقة رائعة أو بِع في دقائق." },
  "home.hero.explore": { fr: "Explorer les annonces", en: "Browse listings", ar: "تصفح الإعلانات" },
  "home.hero.sellFree": { fr: "Déposer une annonce gratuitement", en: "Post an ad for free", ar: "أضف إعلاناً مجاناً" },
  "home.feature.verified.title": { fr: "Vendeurs vérifiés", en: "Verified sellers", ar: "بائعون موثّقون" },
  "home.feature.verified.text": { fr: "Profils et avis pour acheter en confiance.", en: "Profiles and reviews so you can buy with confidence.", ar: "ملفات شخصية وتقييمات للشراء بثقة." },
  "home.feature.delivery.title": { fr: "Livraison Yalidine", en: "Yalidine delivery", ar: "توصيل ياليدين" },
  "home.feature.delivery.text": { fr: "Recevez vos achats partout en Algérie.", en: "Get your purchases delivered anywhere in Algeria.", ar: "استلم مشترياتك في أي مكان بالجزائر." },
  "home.feature.messaging.title": { fr: "Messagerie intégrée", en: "Built-in messaging", ar: "مراسلة مدمجة" },
  "home.feature.messaging.text": { fr: "Discutez directement avec le vendeur.", en: "Chat directly with the seller.", ar: "تحدث مباشرة مع البائع." },
  "home.auctions.title": { fr: "Enchères en cours", en: "Live auctions", ar: "مزادات جارية" },
  "home.seeAll": { fr: "Voir tout", en: "See all", ar: "عرض الكل" },
  "home.recent.title": { fr: "Annonces récentes", en: "Recent listings", ar: "إعلانات حديثة" },
  "home.trending.title": { fr: "Tendances", en: "Trending", ar: "الأكثر رواجاً" },
  "home.loadError": { fr: "Impossible de charger les annonces", en: "Unable to load listings", ar: "تعذر تحميل الإعلانات" },
  "home.empty.title": { fr: "Aucune annonce pour le moment.", en: "No listings yet.", ar: "لا توجد إعلانات حتى الآن." },
  "home.empty.cta": { fr: "Soyez le premier à vendre quelque chose →", en: "Be the first to sell something →", ar: "كن أول من يبيع شيئاً ←" },

  "search.category": { fr: "Catégorie", en: "Category", ar: "الفئة" },
  "search.allCategories": { fr: "Toutes les catégories", en: "All categories", ar: "كل الفئات" },
  "search.wilaya": { fr: "Wilaya", en: "Wilaya", ar: "الولاية" },
  "search.allWilayas": { fr: "Toutes les wilayas", en: "All wilayas", ar: "كل الولايات" },
  "search.type": { fr: "Type d'annonce", en: "Listing type", ar: "نوع الإعلان" },
  "search.all": { fr: "Tous", en: "All", ar: "الكل" },
  "search.buyNow": { fr: "Achat immédiat", en: "Buy it now", ar: "شراء فوري" },
  "search.auction": { fr: "Enchères", en: "Auctions", ar: "مزادات" },
  "search.reset": { fr: "Réinitialiser les filtres", en: "Reset filters", ar: "إعادة ضبط الفلاتر" },
  "search.resultsFor": { fr: "Résultats pour", en: "Results for", ar: "نتائج البحث عن" },
  "search.allListings": { fr: "Toutes les annonces", en: "All listings", ar: "جميع الإعلانات" },
  "search.filters": { fr: "Filtres", en: "Filters", ar: "الفلاتر" },
  "search.resultsCount": { fr: "annonce(s) trouvée(s)", en: "listing(s) found", ar: "إعلان(ات) موجود(ة)" },
  "search.sort.newest": { fr: "Plus récent", en: "Newest", ar: "الأحدث" },
  "search.sort.priceAsc": { fr: "Prix croissant", en: "Price: low to high", ar: "السعر: من الأقل" },
  "search.sort.priceDesc": { fr: "Prix décroissant", en: "Price: high to low", ar: "السعر: من الأعلى" },
  "search.sort.popular": { fr: "Plus populaire", en: "Most popular", ar: "الأكثر شهرة" },
  "search.noResults": { fr: "Aucune annonce ne correspond à votre recherche.", en: "No listings match your search.", ar: "لا توجد إعلانات مطابقة لبحثك." },
  "search.close": { fr: "Fermer", en: "Close", ar: "إغلاق" },
  "search.priceRange": { fr: "Fourchette de prix", en: "Price range", ar: "نطاق السعر" },
  "search.minPrice": { fr: "Min", en: "Min", ar: "الأدنى" },
  "search.maxPrice": { fr: "Max", en: "Max", ar: "الأعلى" },
  "search.prevPage": { fr: "Précédent", en: "Previous", ar: "السابق" },
  "search.nextPage": { fr: "Suivant", en: "Next", ar: "التالي" },
  "search.pageOf": { fr: "Page {page} sur {total}", en: "Page {page} of {total}", ar: "صفحة {page} من {total}" },

  "card.sold": { fr: "Vendu", en: "Sold", ar: "تم البيع" },
  "card.auctionEnded": { fr: "Enchère terminée", en: "Auction ended", ar: "انتهى المزاد" },
  "card.auction": { fr: "Enchère", en: "Auction", ar: "مزاد" },
  "card.addToCart": { fr: "Ajouter au panier", en: "Add to cart", ar: "أضف إلى السلة" },
  "card.added": { fr: "Ajouté ✓", en: "Added ✓", ar: "أُضيف ✓" },

  "detail.notFound": { fr: "Cette annonce n'existe pas.", en: "This listing doesn't exist.", ar: "هذا الإعلان غير موجود." },
  "detail.backHome": { fr: "Retour à l'accueil", en: "Back to home", ar: "العودة إلى الرئيسية" },
  "detail.currentBid": { fr: "Offre actuelle", en: "Current bid", ar: "العرض الحالي" },
  "detail.price": { fr: "Prix", en: "Price", ar: "السعر" },
  "detail.bidsReceived": { fr: "offre(s) reçue(s)", en: "bid(s) received", ar: "عرض(عروض) مستلم(ة)" },
  "detail.inStock": { fr: "en stock", en: "in stock", ar: "متوفر في المخزون" },
  "detail.outOfStock": { fr: "Plus de stock disponible", en: "Out of stock", ar: "غير متوفر في المخزون" },
  "detail.ownListing": { fr: "Ceci est votre propre annonce.", en: "This is your own listing.", ar: "هذا إعلانك الخاص." },
  "detail.reviews": { fr: "Avis clients", en: "Customer reviews", ar: "تقييمات العملاء" },
  "detail.similar": { fr: "Produits similaires", en: "Similar products", ar: "منتجات مماثلة" },
  "detail.auctionEndedNoBids": { fr: "Cette enchère est terminée, aucune offre n'a été reçue.", en: "This auction has ended with no bids.", ar: "انتهى هذا المزاد دون استلام أي عرض." },
  "trust.banner": { fr: "Paiement à la livraison · Vendeurs identifiés · Messagerie intégrée", en: "Cash on delivery · Identified sellers · Built-in messaging", ar: "الدفع عند الاستلام · بائعون موثّقون · مراسلة مدمجة" },
  "detail.noReviews": { fr: "Aucun avis pour le moment.", en: "No reviews yet.", ar: "لا توجد تقييمات حتى الآن." },
  "detail.leaveReview": { fr: "Laisser un avis", en: "Leave a review", ar: "اترك تقييماً" },
  "detail.editReview": { fr: "Modifier votre avis", en: "Edit your review", ar: "عدّل تقييمك" },
  "detail.commentPlaceholder": { fr: "Votre commentaire (optionnel)", en: "Your comment (optional)", ar: "تعليقك (اختياري)" },
  "detail.publish": { fr: "Publier l'avis", en: "Post review", ar: "نشر التقييم" },
  "detail.update": { fr: "Mettre à jour", en: "Update", ar: "تحديث" },
  "detail.sending": { fr: "Envoi...", en: "Sending...", ar: "جارٍ الإرسال..." },
  "detail.loginToReview": { fr: "Connectez-vous", en: "Log in", ar: "سجّل الدخول" },
  "detail.loginToReviewSuffix": { fr: "pour laisser un avis.", en: "to leave a review.", ar: "لإضافة تقييم." },
  "detail.description": { fr: "Description", en: "Description", ar: "الوصف" },
  "detail.call": { fr: "Appeler", en: "Call", ar: "اتصال" },
  "detail.sellerBadge": { fr: "Vendeur Achri DZ", en: "Achri DZ seller", ar: "بائع أشري دي زاد" },
  "detail.contactSeller": { fr: "Contacter le vendeur", en: "Contact the seller", ar: "التواصل مع البائع" },
  "detail.yourMessage": { fr: "Votre message...", en: "Your message...", ar: "رسالتك..." },
  "detail.send": { fr: "Envoyer", en: "Send", ar: "إرسال" },
  "detail.yourName": { fr: "Votre nom", en: "Your name", ar: "اسمك" },
  "detail.phoneOptional": { fr: "Téléphone (optionnel)", en: "Phone (optional)", ar: "الهاتف (اختياري)" },
  "detail.addedToCart": { fr: "Ajouté au panier !", en: "Added to cart!", ar: "تمت الإضافة إلى السلة!" },
  "detail.purchaseConfirmed": { fr: "Achat confirmé ! Le vendeur va vous contacter.", en: "Purchase confirmed! The seller will contact you.", ar: "تم تأكيد الشراء! سيتواصل البائع معك." },
  "detail.bidPlaced": { fr: "Votre offre a été enregistrée !", en: "Your bid has been placed!", ar: "تم تسجيل عرضك!" },

  "bid.phone": { fr: "Téléphone", en: "Phone", ar: "الهاتف" },
  "bid.place": { fr: "Enchérir", en: "Place bid", ar: "قدّم عرضاً" },
  "bid.submitting": { fr: "...", en: "...", ar: "..." },

  "buy.now": { fr: "Acheter maintenant", en: "Buy now", ar: "اشترِ الآن" },
  "buy.deliveryAddress": { fr: "Adresse de livraison", en: "Delivery address", ar: "عنوان التوصيل" },
  "buy.wilayaDelivery": { fr: "Wilaya de livraison", en: "Delivery wilaya", ar: "ولاية التوصيل" },
  "buy.deliveryHome": { fr: "Livraison à domicile", en: "Home delivery", ar: "التوصيل إلى المنزل" },
  "buy.deliveryPickup": { fr: "Point de retrait", en: "Pickup point", ar: "نقطة استلام" },
  "buy.quantity": { fr: "Quantité", en: "Quantity", ar: "الكمية" },
  "buy.confirm": { fr: "Confirmer la commande", en: "Confirm order", ar: "تأكيد الطلب" },
  "buy.confirming": { fr: "Confirmation...", en: "Confirming...", ar: "جارٍ التأكيد..." },

  "postad.title": { fr: "Déposer une annonce", en: "Post an ad", ar: "أضف إعلاناً" },
  "postad.subtitle": { fr: "Remplissez les détails de votre produit. C'est gratuit et rapide.", en: "Fill in your product's details. It's free and quick.", ar: "أدخل تفاصيل منتجك. سريع ومجاني." },
  "postad.buyNow": { fr: "Achat immédiat", en: "Buy it now", ar: "شراء فوري" },
  "postad.auction": { fr: "Aux enchères", en: "Auction", ar: "بالمزاد" },
  "postad.adTitle": { fr: "Titre de l'annonce", en: "Ad title", ar: "عنوان الإعلان" },
  "postad.adTitlePlaceholder": { fr: "Ex: iPhone 13 Pro Max 256Go, très bon état", en: "E.g.: iPhone 13 Pro Max 256GB, great condition", ar: "مثال: آيفون 13 برو ماكس 256 جيجا، حالة جيدة جداً" },
  "postad.category": { fr: "Catégorie", en: "Category", ar: "الفئة" },
  "postad.condition": { fr: "État", en: "Condition", ar: "الحالة" },
  "postad.startPrice": { fr: "Prix de départ (DA)", en: "Starting price (DZD)", ar: "السعر الابتدائي (دج)" },
  "postad.price": { fr: "Prix (DA)", en: "Price (DZD)", ar: "السعر (دج)" },
  "postad.auctionDuration": { fr: "Durée de l'enchère", en: "Auction duration", ar: "مدة المزاد" },
  "postad.day": { fr: "jour", en: "day", ar: "يوم" },
  "postad.days": { fr: "jours", en: "days", ar: "أيام" },
  "postad.description": { fr: "Description", en: "Description", ar: "الوصف" },
  "postad.descriptionPlaceholder": { fr: "Décrivez votre produit, son état, ses caractéristiques...", en: "Describe your product, its condition, its features...", ar: "صف منتجك، حالته، ومميزاته..." },
  "postad.generateAI": { fr: "Générer avec l'IA", en: "Generate with AI", ar: "إنشاء بالذكاء الاصطناعي" },
  "postad.generating": { fr: "Génération en cours...", en: "Generating...", ar: "جارٍ الإنشاء..." },
  "postad.mainPhoto": { fr: "Photo principale", en: "Main photo", ar: "الصورة الرئيسية" },
  "postad.extraPhotos": { fr: "Photos supplémentaires (optionnel)", en: "Extra photos (optional)", ar: "صور إضافية (اختياري)" },
  "postad.addPhoto": { fr: "+ Ajouter une photo", en: "+ Add a photo", ar: "+ أضف صورة" },
  "postad.stockQuantity": { fr: "Quantité en stock", en: "Stock quantity", ar: "الكمية المتوفرة" },
  "postad.wilaya": { fr: "Wilaya", en: "Wilaya", ar: "الولاية" },
  "postad.contactInfo": { fr: "Vos coordonnées", en: "Your contact details", ar: "معلومات الاتصال" },
  "postad.fullName": { fr: "Nom complet", en: "Full name", ar: "الاسم الكامل" },
  "postad.phone": { fr: "Téléphone", en: "Phone", ar: "الهاتف" },
  "postad.email": { fr: "Email", en: "Email", ar: "البريد الإلكتروني" },
  "postad.emailNote": { fr: "L'email de contact est celui de votre compte et ne peut pas être modifié ici.", en: "Your contact email is your account email and can't be changed here.", ar: "البريد الإلكتروني للتواصل هو بريد حسابك ولا يمكن تغييره هنا." },
  "postad.publish": { fr: "Publier l'annonce", en: "Publish ad", ar: "نشر الإعلان" },
  "postad.publishing": { fr: "Publication...", en: "Publishing...", ar: "جارٍ النشر..." },
  "postad.generateError": { fr: "Renseignez au moins le titre et la catégorie avant de générer une description.", en: "Fill in at least the title and category before generating a description.", ar: "أدخل العنوان والفئة على الأقل قبل إنشاء الوصف." },

  "login.welcome": { fr: "Bienvenue sur Achri DZ", en: "Welcome to Achri DZ", ar: "مرحباً بك في أشري دي زاد" },
  "login.subtitle": { fr: "Connectez-vous pour vendre, enchérir et discuter avec les vendeurs.", en: "Log in to sell, bid, and chat with sellers.", ar: "سجّل الدخول للبيع والمزايدة والتواصل مع البائعين." },
  "login.tab.login": { fr: "Se connecter", en: "Log in", ar: "تسجيل الدخول" },
  "login.tab.register": { fr: "Créer un compte", en: "Create an account", ar: "إنشاء حساب" },
  "login.fullName": { fr: "Nom complet", en: "Full name", ar: "الاسم الكامل" },
  "login.email": { fr: "Email", en: "Email", ar: "البريد الإلكتروني" },
  "login.phone": { fr: "Téléphone", en: "Phone", ar: "الهاتف" },
  "login.wilaya": { fr: "Wilaya", en: "Wilaya", ar: "الولاية" },
  "login.password": { fr: "Mot de passe", en: "Password", ar: "كلمة المرور" },
  "login.passwordHint": { fr: "Au moins 8 caractères.", en: "At least 8 characters.", ar: "8 أحرف على الأقل." },
  "login.submitWait": { fr: "Veuillez patienter...", en: "Please wait...", ar: "يرجى الانتظار..." },
  "login.submitLogin": { fr: "Se connecter", en: "Log in", ar: "تسجيل الدخول" },
  "login.submitRegister": { fr: "Créer mon compte", en: "Create my account", ar: "إنشاء حسابي" },
  "login.terms": { fr: "En continuant, vous acceptez nos conditions d'utilisation.", en: "By continuing, you agree to our terms of use.", ar: "بالمتابعة، فإنك توافق على شروط الاستخدام." },
  "login.backHome": { fr: "Retour à l'accueil", en: "Back to home", ar: "العودة إلى الرئيسية" },
  "login.or": { fr: "ou", en: "or", ar: "أو" },

  "verify.title": { fr: "Vérifiez votre compte", en: "Verify your account", ar: "تحقق من حسابك" },
  "verify.emailPending": { fr: "Votre adresse email n'est pas encore confirmée.", en: "Your email address isn't confirmed yet.", ar: "لم يتم تأكيد بريدك الإلكتروني بعد." },
  "verify.emailVerified": { fr: "Email vérifié", en: "Email verified", ar: "تم تأكيد البريد الإلكتروني" },
  "verify.resendEmail": { fr: "Renvoyer le lien de confirmation", en: "Resend confirmation link", ar: "إعادة إرسال رابط التأكيد" },
  "verify.emailSent": { fr: "Email envoyé ! Vérifiez votre boîte de réception.", en: "Email sent! Check your inbox.", ar: "تم إرسال البريد الإلكتروني! تحقق من بريدك الوارد." },
  "verify.phonePending": { fr: "Votre numéro de téléphone n'est pas encore confirmé.", en: "Your phone number isn't confirmed yet.", ar: "لم يتم تأكيد رقم هاتفك بعد." },
  "verify.phoneVerified": { fr: "Téléphone vérifié", en: "Phone verified", ar: "تم تأكيد الهاتف" },
  "verify.sendCode": { fr: "Recevoir un code par SMS", en: "Get a code by SMS", ar: "استلام رمز عبر الرسائل القصيرة" },
  "verify.codeSent": { fr: "Code envoyé par SMS.", en: "Code sent by SMS.", ar: "تم إرسال الرمز عبر الرسائل القصيرة." },
  "verify.codePlaceholder": { fr: "Code à 6 chiffres", en: "6-digit code", ar: "رمز من 6 أرقام" },
  "verify.confirmCode": { fr: "Confirmer", en: "Confirm", ar: "تأكيد" },
  "verify.needOneMethod": { fr: "Vous devez confirmer au moins votre email ou votre téléphone pour publier une annonce.", en: "You need to confirm at least your email or phone to post a listing.", ar: "يجب تأكيد بريدك الإلكتروني أو هاتفك على الأقل لنشر إعلان." },
  "verify.emailConfirmedBanner": { fr: "Votre adresse email a bien été confirmée !", en: "Your email address has been confirmed!", ar: "تم تأكيد بريدك الإلكتروني بنجاح!" },

  "profile.myListings": { fr: "Mes annonces", en: "My listings", ar: "إعلاناتي" },
  "profile.newListing": { fr: "Nouvelle annonce", en: "New listing", ar: "إعلان جديد" },
  "profile.noListings": { fr: "Vous n'avez pas encore d'annonce.", en: "You don't have any listings yet.", ar: "لا توجد لديك إعلانات حتى الآن." },
  "profile.postFirst": { fr: "Déposez votre première annonce →", en: "Post your first listing →", ar: "أضف إعلانك الأول ←" },

  "cart.title": { fr: "Mon panier", en: "My cart", ar: "سلتي" },
  "cart.loading": { fr: "Chargement du panier...", en: "Loading cart...", ar: "جارٍ تحميل السلة..." },
  "cart.empty": { fr: "Votre panier est vide.", en: "Your cart is empty.", ar: "سلتك فارغة." },
  "cart.continueShopping": { fr: "Continuer mes achats", en: "Continue shopping", ar: "مواصلة التسوق" },
  "cart.total": { fr: "Total", en: "Total", ar: "الإجمالي" },
  "cart.deliveryInfo": { fr: "Informations de livraison", en: "Delivery information", ar: "معلومات التوصيل" },
  "cart.order": { fr: "Commander", en: "Order", ar: "إتمام الطلب" },
  "cart.clear": { fr: "Vider le panier", en: "Clear cart", ar: "تفريغ السلة" },
  "cart.orderConfirmed": { fr: "commande confirmée.", en: "order confirmed.", ar: "تم تأكيد الطلب." },
  "cart.item": { fr: "Article", en: "Item", ar: "عنصر" },

  "wishlist.title": { fr: "Mes favoris", en: "My favorites", ar: "المفضلة" },
  "wishlist.loading": { fr: "Chargement...", en: "Loading...", ar: "جارٍ التحميل..." },
  "wishlist.empty": { fr: "Vous n'avez pas encore ajouté d'annonces à vos favoris.", en: "You haven't added any listings to your favorites yet.", ar: "لم تقم بإضافة أي إعلانات إلى المفضلة حتى الآن." },

  // ---- About page ----
  "about.title": { fr: "À propos d'Achri DZ", en: "About Achri DZ", ar: "من نحن - أشري دي زاد" },
  "about.intro": { fr: "Achri DZ - Algeria Marketplace est la plateforme algérienne de petites annonces qui connecte acheteurs et vendeurs partout dans les 58 wilayas, en toute simplicité et en toute confiance.", en: "Achri DZ - Algeria Marketplace is the Algerian classifieds platform connecting buyers and sellers across all 58 wilayas, simply and with confidence.", ar: "أشري دي زاد - سوق الجزائر هو منصة الإعلانات المبوبة الجزائرية التي تربط البائعين والمشترين في 58 ولاية، بسهولة وثقة." },
  "about.mission.title": { fr: "Notre mission", en: "Our mission", ar: "مهمتنا" },
  "about.mission.text": { fr: "Donner à chaque Algérien les moyens d'acheter et de vendre facilement, que ce soit un téléphone, une voiture, un bien immobilier ou des objets du quotidien — avec des outils modernes : enchères, paiement à la livraison, messagerie intégrée et avis vérifiés.", en: "Give every Algerian the tools to buy and sell easily — a phone, a car, a property, or everyday items — with modern features: auctions, cash on delivery, built-in messaging, and verified reviews.", ar: "تمكين كل جزائري من البيع والشراء بسهولة — سواء كان هاتفاً أو سيارة أو عقاراً أو أدوات يومية — بأدوات عصرية: مزادات، الدفع عند التوصيل، مراسلة مدمجة، وتقييمات موثقة." },
  "about.values.title": { fr: "Nos valeurs", en: "Our values", ar: "قيمنا" },
  "about.value.trust.title": { fr: "Confiance", en: "Trust", ar: "الثقة" },
  "about.value.trust.text": { fr: "Comptes vérifiés, avis publics et messagerie sécurisée pour des transactions sereines.", en: "Verified accounts, public reviews, and secure messaging for worry-free transactions.", ar: "حسابات موثقة، تقييمات عامة، ومراسلة آمنة لمعاملات هادئة." },
  "about.value.local.title": { fr: "100% algérien", en: "100% Algerian", ar: "100٪ جزائري" },
  "about.value.local.text": { fr: "Pensé pour le marché algérien : Dinar Algérien, wilayas, et livraison Yalidine Express.", en: "Built for the Algerian market: Algerian Dinar, wilayas, and Yalidine Express delivery.", ar: "مصمم للسوق الجزائري: الدينار الجزائري، الولايات، والتوصيل عبر ياليدين إكسبرس." },
  "about.value.simplicity.title": { fr: "Simplicité", en: "Simplicity", ar: "البساطة" },
  "about.value.simplicity.text": { fr: "Déposer une annonce ou acheter un produit prend moins de deux minutes.", en: "Posting an ad or buying a product takes less than two minutes.", ar: "نشر إعلان أو شراء منتج يستغرق أقل من دقيقتين." },

  // ---- Contact page ----
  "contact.title": { fr: "Contactez-nous", en: "Contact us", ar: "اتصل بنا" },
  "contact.subtitle": { fr: "Une question, un problème avec une annonce, ou une suggestion ? Notre équipe vous répond rapidement.", en: "A question, an issue with a listing, or a suggestion? Our team responds quickly.", ar: "سؤال، مشكلة في إعلان، أو اقتراح؟ فريقنا يرد بسرعة." },
  "contact.email": { fr: "Email", en: "Email", ar: "البريد الإلكتروني" },
  "contact.phone": { fr: "Téléphone", en: "Phone", ar: "الهاتف" },
  "contact.address": { fr: "Adresse", en: "Address", ar: "العنوان" },
  "contact.addressValue": { fr: "Alger, Algérie", en: "Algiers, Algeria", ar: "الجزائر العاصمة، الجزائر" },
  "contact.form.title": { fr: "Envoyez-nous un message", en: "Send us a message", ar: "أرسل لنا رسالة" },
  "contact.form.name": { fr: "Votre nom", en: "Your name", ar: "اسمك" },
  "contact.form.email": { fr: "Votre email", en: "Your email", ar: "بريدك الإلكتروني" },
  "contact.form.message": { fr: "Votre message", en: "Your message", ar: "رسالتك" },
  "contact.form.send": { fr: "Envoyer le message", en: "Send message", ar: "إرسال الرسالة" },
  "contact.form.sent": { fr: "Merci ! Votre message a été noté, nous vous répondrons par email dès que possible.", en: "Thank you! Your message has been recorded, we'll reply by email as soon as possible.", ar: "شكراً لك! تم تسجيل رسالتك، سنرد عليك عبر البريد الإلكتروني في أقرب وقت." },

  // ---- FAQ page ----
  "faq.title": { fr: "Questions fréquentes", en: "Frequently asked questions", ar: "الأسئلة الشائعة" },
  "faq.subtitle": { fr: "Tout ce qu'il faut savoir pour bien utiliser Achri DZ.", en: "Everything you need to know to make the most of Achri DZ.", ar: "كل ما تحتاج معرفته لاستخدام أشري دي زاد بأفضل شكل." },
  "faq.q1": { fr: "Comment déposer une annonce ?", en: "How do I post a listing?", ar: "كيف أضيف إعلاناً؟" },
  "faq.a1": { fr: "Créez un compte gratuit, cliquez sur \"Déposer une annonce\", remplissez le titre, la catégorie, le prix et les photos, puis publiez. C'est gratuit et ça prend moins de deux minutes.", en: "Create a free account, click \"Post an ad\", fill in the title, category, price and photos, then publish. It's free and takes less than two minutes.", ar: "أنشئ حساباً مجانياً، اضغط على \"أضف إعلاناً\"، أدخل العنوان والفئة والسعر والصور، ثم انشر. الأمر مجاني ويستغرق أقل من دقيقتين." },
  "faq.q2": { fr: "Comment fonctionnent les enchères ?", en: "How do auctions work?", ar: "كيف تعمل المزادات؟" },
  "faq.a2": { fr: "Le vendeur fixe un prix de départ et une durée. Les acheteurs placent des offres supérieures à l'offre actuelle. À la fin de l'enchère, le vendeur contacte l'offrant le plus élevé pour finaliser la vente.", en: "The seller sets a starting price and a duration. Buyers place bids higher than the current bid. When the auction ends, the seller contacts the highest bidder to finalize the sale.", ar: "يحدد البائع سعراً ابتدائياً ومدة. يقدم المشترون عروضاً أعلى من العرض الحالي. عند انتهاء المزاد، يتواصل البائع مع أعلى عارض لإتمام البيع." },
  "faq.q3": { fr: "Quels modes de paiement sont disponibles ?", en: "What payment methods are available?", ar: "ما هي طرق الدفع المتاحة؟" },
  "faq.a3": { fr: "Achri DZ met en relation acheteurs et vendeurs ; le paiement se fait généralement en main propre ou à la livraison, directement entre les deux parties.", en: "Achri DZ connects buyers and sellers; payment is usually made in person or on delivery, directly between the two parties.", ar: "يربط أشري دي زاد بين البائعين والمشترين؛ يتم الدفع عادةً يداً بيد أو عند التوصيل، مباشرة بين الطرفين." },
  "faq.q4": { fr: "Comment se passe la livraison ?", en: "How does delivery work?", ar: "كيف يتم التوصيل؟" },
  "faq.a4": { fr: "Vous pouvez choisir une remise en main propre ou une livraison via Yalidine Express, à domicile ou en point de retrait, selon ce que propose le vendeur.", en: "You can choose an in-person handoff or delivery via Yalidine Express, either to your home or a pickup point, depending on what the seller offers.", ar: "يمكنك اختيار التسليم اليدوي أو التوصيل عبر ياليدين إكسبرس، إلى المنزل أو نقطة استلام، حسب ما يوفره البائع." },
  "faq.q5": { fr: "Comment signaler une annonce suspecte ?", en: "How do I report a suspicious listing?", ar: "كيف أبلغ عن إعلان مشبوه؟" },
  "faq.a5": { fr: "Contactez notre équipe via la page Contact en précisant le lien de l'annonce. Nous vérifions chaque signalement rapidement.", en: "Contact our team via the Contact page with the listing's link. We review every report quickly.", ar: "تواصل مع فريقنا عبر صفحة الاتصال مع تحديد رابط الإعلان. نراجع كل بلاغ بسرعة." },
  "faq.q6": { fr: "Mes informations sont-elles en sécurité ?", en: "Is my information safe?", ar: "هل معلوماتي بأمان؟" },
  "faq.a6": { fr: "Oui. Vos mots de passe sont chiffrés, vos sessions sont sécurisées, et nous ne partageons jamais vos données avec des tiers sans votre accord. Voir notre Politique de confidentialité.", en: "Yes. Your passwords are encrypted, your sessions are secure, and we never share your data with third parties without your consent. See our Privacy Policy.", ar: "نعم. كلمات المرور مشفرة، الجلسات آمنة، ولا نشارك بياناتك مع أي طرف ثالث دون موافقتك. راجع سياسة الخصوصية." },

  // ---- Terms page ----
  "terms.title": { fr: "Conditions d'utilisation", en: "Terms of use", ar: "شروط الاستخدام" },
  "terms.updated": { fr: "Dernière mise à jour : 25 juin 2026", en: "Last updated: June 25, 2026", ar: "آخر تحديث: 25 يونيو 2026" },
  "terms.s1.title": { fr: "1. Acceptation des conditions", en: "1. Acceptance of terms", ar: "1. قبول الشروط" },
  "terms.s1.text": { fr: "En créant un compte ou en utilisant Achri DZ, vous acceptez les présentes conditions d'utilisation dans leur intégralité.", en: "By creating an account or using Achri DZ, you accept these terms of use in full.", ar: "بإنشاء حساب أو استخدام أشري دي زاد، فإنك توافق على شروط الاستخدام هذه بالكامل." },
  "terms.s2.title": { fr: "2. Comptes utilisateurs", en: "2. User accounts", ar: "2. حسابات المستخدمين" },
  "terms.s2.text": { fr: "Vous devez fournir des informations exactes lors de votre inscription et êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte.", en: "You must provide accurate information when registering and are responsible for keeping your password confidential and for any activity carried out from your account.", ar: "يجب تقديم معلومات دقيقة عند التسجيل، وأنت مسؤول عن سرية كلمة مرورك وعن أي نشاط يتم من حسابك." },
  "terms.s3.title": { fr: "3. Annonces et contenu", en: "3. Listings and content", ar: "3. الإعلانات والمحتوى" },
  "terms.s3.text": { fr: "Les annonces doivent décrire des produits réels, légaux, et appartenant au vendeur. Sont interdits : les armes, les substances illicites, la contrefaçon, et tout contenu frauduleux ou trompeur.", en: "Listings must describe real, legal products owned by the seller. Prohibited: weapons, illegal substances, counterfeits, and any fraudulent or misleading content.", ar: "يجب أن تصف الإعلانات منتجات حقيقية وقانونية يملكها البائع. يُمنع: الأسلحة، المواد غير القانونية، التقليد، وأي محتوى مضلل أو احتيالي." },
  "terms.s4.title": { fr: "4. Transactions entre utilisateurs", en: "4. Transactions between users", ar: "4. المعاملات بين المستخدمين" },
  "terms.s4.text": { fr: "Achri DZ met en relation acheteurs et vendeurs mais n'est pas partie aux transactions. Nous recommandons de vérifier le produit avant tout paiement et de privilégier la remise en main propre ou le paiement à la livraison.", en: "Achri DZ connects buyers and sellers but is not a party to the transaction itself. We recommend inspecting the product before any payment, and favoring in-person handoff or cash on delivery.", ar: "يربط أشري دي زاد بين البائعين والمشترين دون أن يكون طرفاً في المعاملة. نوصي بفحص المنتج قبل أي دفع، وتفضيل التسليم اليدوي أو الدفع عند التوصيل." },
  "terms.s5.title": { fr: "5. Suspension de compte", en: "5. Account suspension", ar: "5. تعليق الحساب" },
  "terms.s5.text": { fr: "Nous pouvons suspendre ou supprimer tout compte qui enfreint ces conditions, publie du contenu frauduleux, ou nuit à la sécurité des autres utilisateurs.", en: "We may suspend or remove any account that violates these terms, posts fraudulent content, or harms the safety of other users.", ar: "يجوز لنا تعليق أو حذف أي حساب يخالف هذه الشروط، أو ينشر محتوى احتيالياً، أو يضر بسلامة المستخدمين الآخرين." },
  "terms.s6.title": { fr: "6. Modifications", en: "6. Changes", ar: "6. التعديلات" },
  "terms.s6.text": { fr: "Ces conditions peuvent évoluer ; la version en vigueur est toujours celle publiée sur cette page.", en: "These terms may change over time; the version in force is always the one published on this page.", ar: "قد تتغير هذه الشروط مع الوقت؛ النسخة المعمول بها هي دائماً المنشورة في هذه الصفحة." },

  // ---- Privacy page ----
  "privacy.title": { fr: "Politique de confidentialité", en: "Privacy policy", ar: "سياسة الخصوصية" },
  "privacy.updated": { fr: "Dernière mise à jour : 25 juin 2026", en: "Last updated: June 25, 2026", ar: "آخر تحديث: 25 يونيو 2026" },
  "privacy.s1.title": { fr: "1. Données que nous collectons", en: "1. Data we collect", ar: "1. البيانات التي نجمعها" },
  "privacy.s1.text": { fr: "Nom, email, numéro de téléphone et wilaya lors de l'inscription ; les annonces, avis et messages que vous publiez ; des informations techniques basiques (adresse IP, type de navigateur) pour la sécurité.", en: "Name, email, phone number and wilaya at registration; the listings, reviews and messages you post; basic technical information (IP address, browser type) for security.", ar: "الاسم، البريد الإلكتروني، رقم الهاتف والولاية عند التسجيل؛ الإعلانات والتقييمات والرسائل التي تنشرها؛ معلومات تقنية أساسية (عنوان IP، نوع المتصفح) للأمان." },
  "privacy.s2.title": { fr: "2. Comment nous utilisons vos données", en: "2. How we use your data", ar: "2. كيف نستخدم بياناتك" },
  "privacy.s2.text": { fr: "Pour faire fonctionner votre compte, afficher vos annonces, vous mettre en relation avec d'autres utilisateurs, et améliorer la sécurité de la plateforme. Nous ne vendons jamais vos données.", en: "To run your account, display your listings, connect you with other users, and improve platform security. We never sell your data.", ar: "لتشغيل حسابك، وعرض إعلاناتك، وربطك بمستخدمين آخرين، وتحسين أمان المنصة. لا نبيع بياناتك مطلقاً." },
  "privacy.s3.title": { fr: "3. Partage des données", en: "3. Data sharing", ar: "3. مشاركة البيانات" },
  "privacy.s3.text": { fr: "Votre nom et téléphone sont visibles par les autres utilisateurs uniquement dans le cadre d'une annonce ou d'une transaction que vous initiez. Nous ne partageons pas vos données avec des tiers à des fins publicitaires.", en: "Your name and phone number are visible to other users only in the context of a listing or transaction you initiate. We do not share your data with third parties for advertising purposes.", ar: "اسمك وهاتفك يكونان مرئيين لمستخدمين آخرين فقط في سياق إعلان أو معاملة تبدأها أنت. لا نشارك بياناتك مع أطراف ثالثة لأغراض إعلانية." },
  "privacy.s4.title": { fr: "4. Sécurité", en: "4. Security", ar: "4. الأمان" },
  "privacy.s4.text": { fr: "Les mots de passe sont chiffrés (bcrypt) et les sessions sont protégées par des cookies sécurisés httpOnly. Nous appliquons des limites de requêtes pour limiter les abus.", en: "Passwords are encrypted (bcrypt) and sessions are protected with secure httpOnly cookies. We apply rate limits to reduce abuse.", ar: "كلمات المرور مشفرة (bcrypt) والجلسات محمية بملفات تعريف آمنة httpOnly. نطبق حدوداً على عدد الطلبات للحد من الإساءة." },
  "privacy.s5.title": { fr: "5. Vos droits", en: "5. Your rights", ar: "5. حقوقك" },
  "privacy.s5.text": { fr: "Vous pouvez demander la suppression de votre compte et de vos données à tout moment en nous contactant via la page Contact.", en: "You can request deletion of your account and data at any time by contacting us via the Contact page.", ar: "يمكنك طلب حذف حسابك وبياناتك في أي وقت من خلال التواصل معنا عبر صفحة الاتصال." },

  // ---- 404 ----
  "notfound.title": { fr: "Page introuvable", en: "Page not found", ar: "الصفحة غير موجودة" },
  "notfound.text": { fr: "La page que vous recherchez n'existe pas ou a été déplacée.", en: "The page you're looking for doesn't exist or has been moved.", ar: "الصفحة التي تبحث عنها غير موجودة أو تم نقلها." },
  "notfound.cta": { fr: "Retour à l'accueil", en: "Back to home", ar: "العودة إلى الرئيسية" },

  // ---- Seller public profile ----
  "seller.badge": { fr: "Vendeur", en: "Seller", ar: "بائع" },
  "seller.verifiedBadge": { fr: "Vendeur vérifié", en: "Verified seller", ar: "بائع موثّق" },
  "seller.memberSince": { fr: "Membre depuis", en: "Member since", ar: "عضو منذ" },
  "seller.totalListings": { fr: "annonce(s) publiée(s)", en: "listing(s) posted", ar: "إعلان(ات) منشور(ة)" },
  "seller.totalSales": { fr: "vente(s) réalisée(s)", en: "sale(s) completed", ar: "عملية(ات) بيع مكتملة" },
  "seller.rating": { fr: "Note moyenne", en: "Average rating", ar: "التقييم المتوسط" },
  "seller.noRating": { fr: "Pas encore d'avis", en: "No reviews yet", ar: "لا توجد تقييمات حتى الآن" },
  "seller.activeListings": { fr: "Annonces en cours", en: "Active listings", ar: "الإعلانات الحالية" },
  "seller.noListings": { fr: "Ce vendeur n'a aucune annonce active pour le moment.", en: "This seller has no active listings right now.", ar: "لا يملك هذا البائع إعلانات نشطة حالياً." },
  "seller.notFound": { fr: "Vendeur introuvable.", en: "Seller not found.", ar: "البائع غير موجود." },
  "seller.viewProfile": { fr: "Voir le profil du vendeur", en: "View seller profile", ar: "عرض ملف البائع" },

  // ---- Profile listing management ----
  "profile.markSold": { fr: "Marquer comme vendu", en: "Mark as sold", ar: "وضع علامة كمباع" },
  "profile.markActive": { fr: "Remettre en vente", en: "Reactivate listing", ar: "إعادة تفعيل الإعلان" },
  "profile.delete": { fr: "Supprimer", en: "Delete", ar: "حذف" },
  "profile.deleteConfirm": { fr: "Supprimer définitivement cette annonce ?", en: "Permanently delete this listing?", ar: "حذف هذا الإعلان نهائياً؟" },
  "profile.manage": { fr: "Gérer", en: "Manage", ar: "إدارة" },
  "profile.views": { fr: "vue(s)", en: "view(s)", ar: "مشاهدة(ات)" },
};

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = dict[key];
  let str = entry ? entry[lang] : key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(`{{${k}}}`, String(v));
    });
  }
  return str;
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "ar" || stored === "fr" ? stored : "fr";
  });

  const dir: "ltr" | "rtl" = RTL_LANGS.includes(lang) ? "rtl" : "ltr";

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: string, vars?: Record<string, string | number>) => t(lang, key, vars),
      dir,
    }),
    [lang, dir]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

// ------------------- DATA TRANSLATIONS -------------------
// Categories, wilayas and conditions are stored in French (canonical values
// used for filtering/storage) but displayed translated based on the active
// language.

const categoryTranslations: Record<string, Record<Lang, string>> = {
  "Téléphones & Tech": { fr: "Téléphones & Tech", en: "Phones & Tech", ar: "هواتف وتقنية" },
  "Véhicules": { fr: "Véhicules", en: "Vehicles", ar: "مركبات" },
  "Immobilier": { fr: "Immobilier", en: "Real Estate", ar: "عقارات" },
  "Mode": { fr: "Mode", en: "Fashion", ar: "أزياء" },
  "Maison & Jardin": { fr: "Maison & Jardin", en: "Home & Garden", ar: "منزل وحديقة" },
  "Outils & Bricolage": { fr: "Outils & Bricolage", en: "Tools & DIY", ar: "أدوات وعدّة" },
  "Électroménager": { fr: "Électroménager", en: "Appliances", ar: "أجهزة منزلية" },
  "Loisirs & Sports": { fr: "Loisirs & Sports", en: "Hobbies & Sports", ar: "هوايات ورياضة" },
  "Autres": { fr: "Autres", en: "Other", ar: "أخرى" },
};

const conditionTranslations: Record<string, Record<Lang, string>> = {
  "Neuf": { fr: "Neuf", en: "New", ar: "جديد" },
  "Comme neuf": { fr: "Comme neuf", en: "Like new", ar: "كالجديد" },
  "Bon état": { fr: "Bon état", en: "Good condition", ar: "حالة جيدة" },
  "État correct": { fr: "État correct", en: "Fair condition", ar: "حالة مقبولة" },
  "Pour pièces": { fr: "Pour pièces", en: "For parts", ar: "للقطع" },
};

const wilayaTranslations: Record<string, Record<Lang, string>> = {
  "Alger": { fr: "Alger", en: "Algiers", ar: "الجزائر" },
  "Oran": { fr: "Oran", en: "Oran", ar: "وهران" },
  "Constantine": { fr: "Constantine", en: "Constantine", ar: "قسنطينة" },
  "Annaba": { fr: "Annaba", en: "Annaba", ar: "عنابة" },
  "Blida": { fr: "Blida", en: "Blida", ar: "البليدة" },
  "Batna": { fr: "Batna", en: "Batna", ar: "باتنة" },
  "Sétif": { fr: "Sétif", en: "Setif", ar: "سطيف" },
  "Tlemcen": { fr: "Tlemcen", en: "Tlemcen", ar: "تلمسان" },
  "Béjaïa": { fr: "Béjaïa", en: "Bejaia", ar: "بجاية" },
  "Tizi Ouzou": { fr: "Tizi Ouzou", en: "Tizi Ouzou", ar: "تيزي وزو" },
  "Mostaganem": { fr: "Mostaganem", en: "Mostaganem", ar: "مستغانم" },
  "Bechar": { fr: "Bechar", en: "Bechar", ar: "بشار" },
  "Biskra": { fr: "Biskra", en: "Biskra", ar: "بسكرة" },
  "El Oued": { fr: "El Oued", en: "El Oued", ar: "الوادي" },
  "Ghardaïa": { fr: "Ghardaïa", en: "Ghardaia", ar: "غرداية" },
  "Ouargla": { fr: "Ouargla", en: "Ouargla", ar: "ورقلة" },
  "Tiaret": { fr: "Tiaret", en: "Tiaret", ar: "تيارت" },
  "Sidi Bel Abbès": { fr: "Sidi Bel Abbès", en: "Sidi Bel Abbes", ar: "سيدي بلعباس" },
  "Skikda": { fr: "Skikda", en: "Skikda", ar: "سكيكدة" },
  "Chlef": { fr: "Chlef", en: "Chlef", ar: "الشلف" },
  "Médéa": { fr: "Médéa", en: "Medea", ar: "المدية" },
  "Bordj Bou Arréridj": { fr: "Bordj Bou Arréridj", en: "Bordj Bou Arreridj", ar: "برج بوعريريج" },
  "Tébessa": { fr: "Tébessa", en: "Tebessa", ar: "تبسة" },
  "Jijel": { fr: "Jijel", en: "Jijel", ar: "جيجل" },
  "Relizane": { fr: "Relizane", en: "Relizane", ar: "غليزان" },
};

export function tCategory(lang: Lang, value: string): string {
  return categoryTranslations[value]?.[lang] ?? value;
}

export function tCondition(lang: Lang, value: string): string {
  return conditionTranslations[value]?.[lang] ?? value;
}

export function tWilaya(lang: Lang, value: string): string {
  return wilayaTranslations[value]?.[lang] ?? value;
}
