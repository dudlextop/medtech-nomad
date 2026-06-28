export type ClinicBranchProfile = {
  city: string;
  address: string;
  phone?: string;
  working_hours?: string;
  coordinates?: { lat: number; lng: number };
};

export type ClinicReviewSummary = {
  source: string;
  summary: string;
};

export type ClinicProfile = {
  id: string;
  name: string;
  short_description: string;
  detailed_description: string;
  website?: string;
  phone?: string;
  working_hours: string;
  service_languages: string[];
  clinic_type: string;
  highlights: string[];
  certificates_display: string[];
  city_coverage: string[];
  branch_notes: string;
  branches: ClinicBranchProfile[];
  review_summary: ClinicReviewSummary;
};

export const primaryClinicOrder = [
  "invivo kazakhstan",
  "kdl/olymp",
  "medical park",
  "dostarmed",
  "гиппократ",
  "on clinic almaty"
];

export const secondaryClinicOrder = [
  "mediker",
  "emirmed",
  "medline",
  "helix kazakhstan"
];

const clinicProfiles: ClinicProfile[] = [
  {
    id: "clinic-profile-invivo-kazakhstan",
    name: "INVIVO Kazakhstan",
    short_description: "Лабораторная сеть с большим выбором анализов и check-up программ.",
    detailed_description: "Лабораторная сеть с анализами, пакетами обследований и широким городским покрытием по Казахстану.",
    website: "https://invivo.kz",
    phone: "Уточняется по городу",
    working_hours: "По филиалам",
    service_languages: ["Қазақша", "Русский"],
    clinic_type: "Лабораторная сеть",
    highlights: ["Анализы", "Check-up пакеты", "Региональное покрытие"],
    certificates_display: ["Открытые сведения о лабораторной сети", "Информация о филиалах на сайте клиники"],
    city_coverage: ["Алматы", "Астана", "Шымкент", "Караганда", "Актобе", "Павлодар", "Костанай", "Атырау", "Тараз"],
    branch_notes: "Филиалы и график работы отличаются по городам.",
    branches: [
      { city: "Алматы", address: "ул. Сатпаева, 90/1", phone: "Уточняется по городу", working_hours: "По филиалам", coordinates: { lat: 43.2329, lng: 76.8867 } },
      ..."Астана,Шымкент,Караганда,Актобе,Павлодар,Костанай,Атырау,Тараз".split(",").map((city) => ({
        city,
        address: "Адрес уточняется",
        phone: "Уточняется по городу",
        working_hours: "По филиалам"
      }))
    ],
    review_summary: {
      source: "Открытые карточки 2GIS и Google",
      summary: "Пациенты чаще оценивают удобство сети, доступность филиалов и скорость лабораторного обслуживания."
    }
  },
  {
    id: "clinic-profile-kdl-olymp",
    name: "KDL/Olymp",
    short_description: "Крупная лабораторная сеть с открытым прайсом на анализы и диагностику.",
    detailed_description: "KDL/Olymp представлен в публичном каталоге как лабораторная сеть с широким перечнем анализов, исследований и отдельных диагностических услуг. Данные в интерфейсе основаны на открытом прайсе клиники.",
    website: "https://kdlolymp.kz",
    phone: "+7 702 052 8585, +7 700 052 8585",
    working_hours: "График зависит от филиала",
    service_languages: ["Қазақша", "Русский"],
    clinic_type: "Лабораторная сеть",
    highlights: ["Лабораторные анализы", "Широкий перечень услуг", "Открытый прайс"],
    certificates_display: ["Открытые сведения о лабораторной сети", "Информация о филиалах на сайте клиники"],
    city_coverage: ["Астана", "Алматы", "Шымкент"],
    branch_notes: "График и адреса зависят от филиала.",
    branches: [
      { city: "Астана", address: "ул. Улы Дала 10", phone: "+7 702 052 8585, +7 700 052 8585", working_hours: "График зависит от филиала", coordinates: { lat: 51.1059, lng: 71.4246 } },
      { city: "Алматы", address: "Адрес уточняется", phone: "+7 702 052 8585, +7 700 052 8585", working_hours: "График зависит от филиала" },
      { city: "Шымкент", address: "Адрес уточняется", phone: "+7 702 052 8585, +7 700 052 8585", working_hours: "График зависит от филиала" }
    ],
    review_summary: {
      source: "Открытые карточки 2GIS и Google",
      summary: "В отзывах обычно обращают внимание на доступность анализов, филиальную сеть и сроки выдачи результатов."
    }
  },
  {
    id: "clinic-profile-medical-park",
    name: "Medical Park",
    short_description: "Многопрофильный медицинский центр для взрослых и детей.",
    detailed_description: "Многопрофильный медицинский центр для взрослых и детей с направлениями диагностики, УЗИ, терапии и хирургии.",
    website: "https://medicalpark.kz",
    phone: "+7 747 302 33 35, +7 702 075 09 33",
    working_hours: "Пн-пт 08:00-17:00, сб 09:00-13:00",
    service_languages: ["Қазақша", "Русский"],
    clinic_type: "Многопрофильный медицинский центр",
    highlights: ["Взрослые и дети", "Диагностика", "Консультации", "УЗИ"],
    certificates_display: ["Открытые сведения о медицинском центре", "Информация о направлениях на сайте клиники"],
    city_coverage: ["Алматы"],
    branch_notes: "Звонки: пн-пт 08:00-20:00, сб 09:00-18:00, вс 09:00-17:00.",
    branches: [{ city: "Алматы", address: "ул. Розыбакиева, 105Б", phone: "+7 747 302 33 35, +7 702 075 09 33", working_hours: "Пн-пт 08:00-17:00, сб 09:00-13:00", coordinates: { lat: 43.2367, lng: 76.8973 } }],
    review_summary: {
      source: "Открытые карточки 2GIS и Google",
      summary: "Отзывы относятся к работе медицинского центра, приему специалистов и удобству записи."
    }
  },
  {
    id: "clinic-profile-dostarmed",
    name: "Dostarmed",
    short_description: "Медицинский центр с анализами, консультациями и диагностическими услугами.",
    detailed_description: "Медицинский центр в Алматы с диагностикой, лабораторией, check-up программами и стационаром.",
    website: "https://dostarmed.kz",
    phone: "+7 700 344 03 03, +7 727 344 03 03",
    working_hours: "Работает до 22:00",
    service_languages: ["Қазақша", "Русский"],
    clinic_type: "Медицинский центр",
    highlights: ["Анализы", "Диагностика", "Консультации", "Check-up"],
    certificates_display: ["Открытые сведения о медицинском центре", "Публичная информация о направлениях"],
    city_coverage: ["Алматы"],
    branch_notes: "Адрес и график работы лучше уточнять перед визитом.",
    branches: [{ city: "Алматы", address: "ул. Сеченова, 29/7", phone: "Платные услуги: +7 700 344 03 03, +7 727 344 03 03; поликлиника: +7 700 344 03 63, +7 727 344 03 63", working_hours: "Работает до 22:00", coordinates: { lat: 43.2199, lng: 76.8913 } }],
    review_summary: {
      source: "Открытые карточки 2GIS и Google",
      summary: "Отзывы относятся к работе медицинского центра, коммуникации с пациентами и организации приема."
    }
  },
  {
    id: "clinic-profile-hippokrat",
    name: "Гиппократ",
    short_description: "Медицинская сеть в Караганде с поликлиникой, диагностикой и госпиталем.",
    detailed_description: "Медицинская сеть в Караганде с поликлиникой, диагностическим центром, госпиталем и консультационно-диагностическими услугами.",
    website: "https://hippokrat.kz",
    phone: "8 7212 92 20 02",
    working_hours: "График уточняется на сайте клиники",
    service_languages: ["Қазақша", "Русский"],
    clinic_type: "Медицинский центр",
    highlights: ["Караганда", "Анализы", "Диагностика", "Консультации"],
    certificates_display: ["Лицензия №20006526", "Публичная информация о направлениях"],
    city_coverage: ["Караганда"],
    branch_notes: "Адрес и график работы лучше уточнять перед визитом.",
    branches: [
      { city: "Караганда", address: "Поликлиника, ул. Ерубаева, 17", phone: "8 7212 92 20 02", working_hours: "График уточняется", coordinates: { lat: 49.8047, lng: 73.1094 } },
      { city: "Караганда", address: "Диагностический центр, ул. Ерубаева, 8", phone: "8 7212 92 20 02", working_hours: "График уточняется" },
      { city: "Караганда", address: "Диагностический центр, ул. Жамбыла, 16", phone: "8 7212 92 20 02", working_hours: "График уточняется" },
      { city: "Караганда", address: "Госпиталь, Луначарского, 6", phone: "8 7212 92 20 02", working_hours: "График уточняется" }
    ],
    review_summary: {
      source: "Открытые карточки 2GIS и Google",
      summary: "Отзывы относятся к приему пациентов, работе специалистов и доступности услуг в городе."
    }
  },
  {
    id: "clinic-profile-on-clinic-almaty",
    name: "On Clinic Almaty",
    short_description: "Многопрофильный медицинский центр с диагностикой и консультациями.",
    detailed_description: "Международный медицинский центр с консультациями, диагностикой, УЗИ, check-up программами и лабораторными анализами.",
    website: "https://onclinic.kz",
    phone: "+7 702 250 1005, +7 727 347 47 47",
    working_hours: "График уточняется на сайте клиники",
    service_languages: ["Қазақша", "Русский"],
    clinic_type: "Медицинский центр",
    highlights: ["Консультации", "УЗИ", "Диагностика", "Check-up"],
    certificates_display: ["Открытые сведения о медицинском центре", "Публичная информация о направлениях"],
    city_coverage: ["Алматы", "Астана", "Усть-Каменогорск"],
    branch_notes: "Опыт работы сети: 21 год.",
    branches: [
      { city: "Алматы", address: "проспект Абая, 20/14", phone: "+7 702 250 1005, +7 727 347 47 47", working_hours: "График уточняется", coordinates: { lat: 43.2433, lng: 76.9496 } },
      { city: "Астана", address: "Адрес уточняется", phone: "+7 702 250 1005, +7 727 347 47 47", working_hours: "График уточняется" },
      { city: "Усть-Каменогорск", address: "Адрес уточняется", phone: "+7 702 250 1005, +7 727 347 47 47", working_hours: "График уточняется" }
    ],
    review_summary: {
      source: "Открытые карточки 2GIS и Google",
      summary: "Отзывы относятся к работе медицинского центра, консультациям и организации приема."
    }
  },
  ...secondaryClinicOrder.map((key) => profileOnlyClinic(key))
];

export function displayClinicName(value: string) {
  return value
    .replace(/\s+public\s+prices?/gi, "")
    .replace(/[_-]?public[_-]?prices?/gi, "")
    .replace(/\s+price\s+page/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function clinicProfileKey(value: string) {
  return displayClinicName(value).toLowerCase();
}

export function getClinicProfile(name: string) {
  const key = clinicProfileKey(name);
  return clinicProfiles.find((profile) => clinicProfileKey(profile.name) === key);
}

export function getClinicProfileById(id: string) {
  return clinicProfiles.find((profile) => profile.id === id);
}

export function getClinicProfiles() {
  return clinicProfiles;
}

export function clinicSortRank(name: string) {
  const key = clinicProfileKey(name);
  const primary = primaryClinicOrder.indexOf(key);
  if (primary >= 0) return primary;
  const secondary = secondaryClinicOrder.indexOf(key);
  if (secondary >= 0) return primaryClinicOrder.length + secondary;
  return primaryClinicOrder.length + secondaryClinicOrder.length + 100;
}

function profileOnlyClinic(key: string): ClinicProfile {
  if (key === "mediker") {
    return {
      id: "clinic-profile-mediker",
      name: "Mediker",
      short_description: "Медицинская организация с сетью центров и ассистанс-сервисом по Казахстану.",
      detailed_description: "Медицинская организация с сетью центров и ассистанс-сервисом по Казахстану.",
      website: "https://mediker.kz",
      phone: "8 800 080 76 76",
      working_hours: "Контакт-центр 24/7",
      service_languages: ["Қазақша", "Русский"],
      clinic_type: "Медицинская сеть",
      highlights: ["Медицинская сеть", "Ассистанс", "Корпоративная медицина"],
      certificates_display: ["Открытая информация о медицинской сети", "Информация о направлениях на сайте клиники"],
      city_coverage: ["Астана"],
      branch_notes: "Головной офис: Астана, пр. Кабанбай Батыра, 17, блок А.",
      branches: [{ city: "Астана", address: "пр. Кабанбай Батыра, 17, блок А", phone: "8 800 080 76 76", working_hours: "Контакт-центр 24/7" }],
      review_summary: {
        source: "Открытые карточки 2GIS и Google",
        summary: "Отзывы относятся к медицинскому обслуживанию, ассистанс-сервису и организации приема."
      }
    };
  }
  if (key === "emirmed") {
    return {
      id: "clinic-profile-emirmed",
      name: "Emirmed",
      short_description: "Многопрофильная клиника с диагностикой, анализами и круглосуточной связью.",
      detailed_description: "Многопрофильная клиника с большим перечнем отделений, диагностикой, лабораторными анализами и круглосуточной связью.",
      website: "https://emirmed.kz",
      phone: "+7 707 000 01 03",
      working_hours: "Связь 24/7",
      service_languages: ["Қазақша", "Русский"],
      clinic_type: "Многопрофильная клиника",
      highlights: ["Многопрофильная клиника", "Диагностика", "Анализы", "УЗИ"],
      certificates_display: ["Открытая информация о клинике", "Информация о медицинских направлениях"],
      city_coverage: ["Алматы", "Астана", "Шымкент"],
      branch_notes: "Телефон жалоб и предложений: +7 700 999 01 18.",
      branches: [
        { city: "Алматы", address: "ул. Розыбакиева 37В", phone: "+7 707 000 01 03", working_hours: "Связь 24/7" },
        { city: "Алматы", address: "ул. Нусупбекова 26/1", phone: "+7 707 000 01 03", working_hours: "Связь 24/7" },
        { city: "Астана", address: "ул. Куйши Дина 9", phone: "+7 707 000 01 03", working_hours: "Связь 24/7" },
        { city: "Шымкент", address: "ул. Еримбетова 44", phone: "+7 707 000 01 03", working_hours: "Связь 24/7" },
        { city: "Шымкент", address: "ул. Рашидова 36/15", phone: "+7 707 000 01 03", working_hours: "Связь 24/7" }
      ],
      review_summary: {
        source: "Открытые карточки 2GIS и Google",
        summary: "Отзывы относятся к диагностике, работе отделений и доступности связи с клиникой."
      }
    };
  }
  if (key === "medline") {
    return {
      id: "clinic-profile-medline",
      name: "Medline",
      short_description: "Медицинский центр в Алматы с услугами для пациентов и диагностическими направлениями.",
      detailed_description: "Медицинский центр в Алматы с услугами для пациентов и диагностическими направлениями.",
      website: "https://medline.kz",
      phone: "+7 727 381 69 33, +7 727 381 69 34",
      working_hours: "График уточняется на сайте клиники",
      service_languages: ["Қазақша", "Русский"],
      clinic_type: "Медицинский центр",
      highlights: ["Алматы", "Медицинский центр", "Диагностика"],
      certificates_display: ["Открытая информация о медицинском центре", "Информация о медицинских направлениях"],
      city_coverage: ["Алматы"],
      branch_notes: "Основной адрес: Алматы, мкр. Аксай-3А, д. 81.",
      branches: [{ city: "Алматы", address: "мкр. Аксай-3А, д. 81", phone: "+7 727 381 69 33, +7 727 381 69 34", working_hours: "График уточняется" }],
      review_summary: {
        source: "Открытые карточки 2GIS и Google",
        summary: "Отзывы относятся к медицинскому центру, диагностическим направлениям и организации приема."
      }
    };
  }
  if (key === "helix kazakhstan") {
    return {
      id: "clinic-profile-helix-kazakhstan",
      name: "Helix Kazakhstan",
      short_description: "Лабораторная сеть с анализами, диагностическими тестами и программами контроля здоровья.",
      detailed_description: "Helix Kazakhstan — лабораторный сервис с широким перечнем анализов, диагностических исследований и check-up направлений.",
      website: "https://helix.kz",
      phone: "+7 (771) 232 45 04",
      working_hours: "Пн–Сб 07:30–16:00",
      service_languages: ["Қазақша", "Русский"],
      clinic_type: "Лабораторная сеть",
      highlights: ["Лабораторные анализы", "Диагностика", "Check-up", "Открытый прайс"],
      certificates_display: ["Открытая информация о лабораторной сети", "Информация об анализах и диагностических направлениях"],
      city_coverage: ["Алматы"],
      branch_notes: "Основной адрес: Алматы, Медеуский район, мкр. Самал-2, д. 79.",
      branches: [
        {
          city: "Алматы",
          address: "Медеуский район, мкр. Самал-2, д. 79",
          phone: "+7 (771) 232 45 04",
          working_hours: "Пн–Сб 07:30–16:00"
        }
      ],
      review_summary: {
        source: "Открытые карточки 2GIS и Google",
        summary: "Отзывы относятся к лабораторному сервису, организации приема и удобству сдачи анализов."
      }
    };
  }
  const nameMap: Record<string, string> = {
    mediker: "Mediker",
    "helix kazakhstan": "Helix Kazakhstan",
    emirmed: "Emirmed",
    medline: "Medline"
  };
  const name = nameMap[key] ?? key;
  return {
    id: `clinic-profile-${key.replace(/\s+/g, "-")}`,
    name,
    short_description: "Медицинская организация с услугами для пациентов в Казахстане.",
    detailed_description: `${name} представлен как медицинская организация с направлениями для пациентов, консультациями и диагностическими услугами.`,
    working_hours: "График уточняется на сайте клиники",
    service_languages: ["Қазақша", "Русский"],
    clinic_type: "Медицинская организация",
    highlights: ["Консультации", "Диагностика", "Медицинские услуги"],
    certificates_display: ["Открытая информация о клинике", "Информация о медицинских направлениях"],
    city_coverage: ["Алматы"],
    branch_notes: "Филиалы и график работы уточняются перед визитом.",
    branches: [{ city: "Алматы", address: "Адрес уточняется", working_hours: "График уточняется на сайте клиники" }],
    review_summary: {
      source: "Открытые карточки 2GIS и Google",
      summary: "Отзывы относятся к общему опыту обращения в клинику и организации приема."
    }
  };
}
