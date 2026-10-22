// ─────────────────────────────────────────────────────────────
//  DATOS DEL ESTUDIO — edita SOLO este archivo
//  Todo lo que dejes vacío ("") no se muestra en la web:
//  no aparecen botones ni enlaces que no funcionen.
// ─────────────────────────────────────────────────────────────

export const SITE = {
  name: 'Narita Tattoo Studio',

  // Teléfono con prefijo de país, solo números. Ej.: '34612345678'
  phone: '',
  // Número de WhatsApp con prefijo, solo números. Si es el mismo, cópialo aquí.
  whatsapp: '',
  // Mensaje que aparece escrito al abrir WhatsApp
  whatsappMessage: 'Hola, Narita Tattoo. Me gustaría pedir información para hacerme un tatuaje.',

  // Correo público del estudio (opcional)
  email: '',

  // Dirección real del estudio
  address: {
    street: '', //      Ej.: 'Calle Ejemplo, 12, local 3'
    postalCode: '', //  Ej.: '38001'
    city: '', //        Ej.: 'Santa Cruz de Tenerife'
    region: '', //      Ej.: 'Santa Cruz de Tenerife'
    country: 'España',
  },
  // Texto que se busca en Google Maps. Si lo dejas vacío se usa la dirección.
  // Lo más fiable es poner el nombre tal y como aparece en Google Maps.
  mapsQuery: '',

  // Horario de apertura. Ej.:
  // hours: [
  //   { days: 'Lunes a viernes', time: '10:00 – 19:00' },
  //   { days: 'Sábado', time: '10:00 – 14:00' },
  //   { days: 'Domingo', time: 'Cerrado' },
  // ],
  hours: [],

  // Redes sociales: pega la URL completa del perfil
  social: {
    instagram: '', // Ej.: 'https://www.instagram.com/usuario'
    tiktok: '', //    Ej.: 'https://www.tiktok.com/@usuario'
    facebook: '', //  Ej.: 'https://www.facebook.com/pagina'
  },

  // Mientras falten datos, la web muestra avisos discretos de "dato pendiente"
  // para que el estudio vea qué falta. Pon false antes de publicar.
  showPendingNotes: true,
};
