import axios from 'axios';

// получение данных как обычный текст
const instance = axios.create({
    baseURL : 'https://mapapi.susu.ru/integration/map',
    headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
    },
    responseType: 'text'
});

export default instance;
