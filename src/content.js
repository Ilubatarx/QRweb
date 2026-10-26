import {payload} from './qr.js';

const examples={
  link:{value:'https://turestaurante.com/carta'},
  wifi:{ssid:'Wifi de invitados',password:'Ejemplo123',security:'WPA'},
  reviews:{value:'https://g.page/r/tu-negocio/review'},
  instagram:{value:'https://instagram.com/tu-perfil'},
};

export function contentDraft(config){
  return config.kind==='wifi'
    ? {ssid:config.ssid,password:config.password,security:config.security}
    : {value:config.value};
}

export function hasContent(config){
  return Boolean((config.kind==='wifi'?config.ssid:config.value)?.trim());
}

export function examplePayload(kind){
  return payload({kind,...examples[kind]});
}
