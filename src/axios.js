import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// получение данных как обычный текст
const instance = axios.create({
    baseURL : 'https://mapapi.susu.ru/integration/map',
    headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml'
    },
    responseType: 'text'
});

// преобразование xml в json
instance.interceptors.response.use(async (response) => {
    try {
        const result = await parseStringPromise(response.data, { explicitArray: false, trim: true });
        return result;
    } catch (error) {
        console.error('ошибка при парсинге xml: ', error);
        return Promise.reject(error);
    }
}, (error) => {
    return Promise.reject(error);
});

export default instance;
