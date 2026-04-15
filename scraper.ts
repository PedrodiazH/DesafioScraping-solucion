import axios, {AxiosError, AxiosInstance} from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';
import * as fs from 'fs'
import * as path from 'path'
import { Parserr } from './parser';

// Interface diseñada luego de explorar la web Optimizada para un futuro procesamiento
export interface Documento {
    id_interno: string;
    metadatos: {
        nro: string;
        nro_expediente: string;
        nro_resolucion: string;
    };
    entidades: {
        administrado: string[];
        unidad_fiscalizable: string;
    };
    labels: {
        sector: string;
    };
    ruta_pdf: string;
}

export class Scraper{
    private client: AxiosInstance;
    private viewState: string | null = null;
    private url = 'https://publico.oefa.gob.pe/repdig/consulta/consultaTfa.xhtml';
    private outputDir: string;

    constructor(){
        const jar = new CookieJar();    // manejador de cookies
        this.client = wrapper(axios.create({jar,withCredentials: true,
            // spoofing
            headers: {'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                      'Content-Type': 'application/x-www-form-urlencoded' 
                    }
        }));
        // 
        this.outputDir = path.join(process.cwd(), 'data', 'pdfs');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true});
        }
    }

    public async buscarDocumentos(): Promise<string | null> {
        if (!this.viewState) {
            console.error('Viewstate no inicializado\n Problemas al usar initSession');
            return null;
        }

        const payload = new URLSearchParams();  // Diccionario con el body del Request POST (click en buscar)
        payload.append('javax.faces.partial.ajax', 'true');
        payload.append('javax.faces.source', 'listarDetalleInfraccionRAAForm:btnBuscar');
        payload.append('javax.faces.partial.execute', '@all');
        payload.append('javax.faces.partial.render', 'listarDetalleInfraccionRAAForm:pgLista listarDetalleInfraccionRAAForm:txtNroexp');
        payload.append('listarDetalleInfraccionRAAForm:btnBuscar', 'listarDetalleInfraccionRAAForm:btnBuscar');
        payload.append('listarDetalleInfraccionRAAForm', 'listarDetalleInfraccionRAAForm');
        payload.append('listarDetalleInfraccionRAAForm:txtNroexp', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt21', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt25', '');
        payload.append('listarDetalleInfraccionRAAForm:idsector', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt34', '');
        payload.append('listarDetalleInfraccionRAAForm:dt_scrollState', '0,0');
        payload.append('javax.faces.ViewState', this.viewState);

        try {
            console.log('Ejecutando busqueda (Simulando click en "Buscar")');
            const response = await this.client.post(this.url, payload);

            const $ = cheerio.load(response.data, { xmlMode: true }); // Reforzar para formato XML ya que se actualiza solo parte de la web (AJAX)
            
            // Captura expresiones regulares del Viewstate
            // Esto lo hacemos como comodin en el caso de que haya otro Viewstate
            const nuevoViewState = $('update[id*="ViewState"]').text().replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
            if (nuevoViewState) {
                this.viewState = nuevoViewState;
            }

            console.log('Búsqueda exitosa');
            return response.data;
        } catch (error) {
            console.error('Error al realizar la busqueda:', error);
            return null;
        }
    }

    public async obtenerPagina(primerIndice: number): Promise<string | null> {
        if (!this.viewState) return null;

        const payload = new URLSearchParams();
        payload.append('javax.faces.partial.ajax', 'true');
        payload.append('javax.faces.source', 'listarDetalleInfraccionRAAForm:dt');
        payload.append('javax.faces.partial.execute', 'listarDetalleInfraccionRAAForm:dt');
        payload.append('javax.faces.partial.render', 'listarDetalleInfraccionRAAForm:dt');
        payload.append('listarDetalleInfraccionRAAForm:dt', 'listarDetalleInfraccionRAAForm:dt');
        payload.append('listarDetalleInfraccionRAAForm:dt_pagination', 'true');
        payload.append('listarDetalleInfraccionRAAForm:dt_first', primerIndice.toString());
        payload.append('listarDetalleInfraccionRAAForm:dt_rows', '10');
        payload.append('listarDetalleInfraccionRAAForm:dt_skipChildren', 'true');
        payload.append('listarDetalleInfraccionRAAForm:dt_encodeFeature', 'true');
        
        payload.append('listarDetalleInfraccionRAAForm', 'listarDetalleInfraccionRAAForm');
        payload.append('listarDetalleInfraccionRAAForm:txtNroexp', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt21', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt25', '');
        payload.append('listarDetalleInfraccionRAAForm:idsector', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt34', '');
        payload.append('listarDetalleInfraccionRAAForm:dt_scrollState', '0,0');
        payload.append('javax.faces.ViewState', this.viewState);

        try {
            console.log(`\nSolicitando página (Fila de inicio: ${primerIndice})...`);
            
            const response = await this.client.post(this.url, payload, {
                headers: { 'Faces-Request': 'partial/ajax' } 
            });
            
            // Actualizamos el ViewState con comodin seguro
            const $ = cheerio.load(response.data, { xmlMode: true }); 
            const nuevoViewState = $('update[id*="ViewState"]').text().replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
            if (nuevoViewState) this.viewState = nuevoViewState;

            // Extraemos las filas y las envolvemos
            const matchTabla = response.data.match(/<update id="listarDetalleInfraccionRAAForm:dt"><!\[CDATA\[([\s\S]*?)\]\]><\/update>/); // busca etiqueta update

            if (matchTabla && matchTabla[1]) {
                const filasSueltas = matchTabla[1]; //extraccion del grupo
                const htmlCorregido = `<table><tbody>${filasSueltas}</tbody></table>`;
                return htmlCorregido; 
            }

            return null; 
        } catch (error) {
            console.error('Error al cambiar de página:', error);
            return null;
        }
    }
    // Funcion de conexion
    public async initSession(): Promise<string | null> {
        try{
            console.log('Conectando con el servidor');
            const response = await this.client.get(this.url); // get 
            const parser = cheerio.load(response.data); 
            
            this.viewState = parser('input[name="javax.faces.ViewState"]').val() as string; // Input oculto ViewState
            if (!this.viewState) {
                    throw new Error('No se pudo encontrar el ViewState en el HTML');
                }

            console.log('Sesion iniciada Correctamente!');
            return response.data 
        } catch (error){
            console.error('Error al iniciar el servidor', error);
            return null;
        }
    }

    public async downloadPDF(indiceFila: number, uuidDocumento: string, nombreArchivo: string, maxRetries: number = 3): Promise<boolean> {
        if(!this.viewState){
            console.error('ViewState no inicializado');
            return false;
        }
        const actionTarget = `listarDetalleInfraccionRAAForm:dt:${indiceFila}:j_idt63`;
        
        const payload = new URLSearchParams();
        payload.append('listarDetalleInfraccionRAAForm', 'listarDetalleInfraccionRAAForm');
        payload.append('listarDetalleInfraccionRAAForm:txtNroexp', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt21', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt25', '');
        payload.append('listarDetalleInfraccionRAAForm:idsector', '');
        payload.append('listarDetalleInfraccionRAAForm:j_idt34', '');
        payload.append('listarDetalleInfraccionRAAForm:dt_scrollState', '0,0');
        payload.append('javax.faces.ViewState', this.viewState);
        payload.append(actionTarget, actionTarget); 
        payload.append('param_uuid', uuidDocumento); 

        let retryCount = 0;
        let delay = 2500;

        // Con retry inteligente para evitar error 429 (concepto de exponencial backoff)
        // Se podría hacer mas robusto con suma de aleatoria, pero para este caso es perfecto
        while (retryCount <= maxRetries){
            try{
                console.log(`Intentado descargar ${indiceFila} | (Intento ${retryCount + 1})`)
                const response = await this.client.post(this.url, payload,{
                    responseType: 'arraybuffer' 
                });

                if (response.headers['content-type']?.includes('application/pdf') || response.headers['content-type']?.includes('octet-stream')) {
                    const filePath = path.join(this.outputDir, nombreArchivo);
                    fs.writeFileSync(filePath, response.data);
                    console.log(`PDF guardado: ${filePath}`);
                    return true;
                } else {
                    console.warn(` La respuesta no es un PDF\n Content-Type: ${response.headers['content-type']}`);
                    throw new Error('La respuesta no es un archivo valido');
                }
            } catch (error) {
                const axiosError = error as AxiosError;
                
                if (axiosError.response && axiosError.response.status === 429) {
                    console.warn(`Error 429 (Rate Limit). Esperando ${delay}ms`);
                } else {
                    console.warn(`Error de servidor: ${axiosError.message}. Esperando ${delay}ms`);
                }

                if (retryCount === maxRetries) {
                    console.error(`Fallo tras ${maxRetries} reintentos para la fila ${indiceFila}.`);
                    return false;
                }

                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; 
                retryCount++;
            }
        }
        return false;
    }
}

async function main(){
    const outputDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(outputDir)) {                        // Seguro de no borrar progreso previo (en caso de interrupcion de scraping)
        fs.mkdirSync(outputDir, { recursive: true });
    }
    if (!fs.existsSync(path.join(outputDir, 'pdfs'))) {
        fs.mkdirSync(path.join(outputDir, 'pdfs'), { recursive: true });
    }

    const scraper = new Scraper();
    await scraper.initSession(); 
    let htmlConDatos = await scraper.buscarDocumentos();
    
    let dt_first = 0; 
    let totalDescargados = 0;

    if (htmlConDatos) {
        const metadataPath = path.join(process.cwd(), 'data', 'metadata.jsonl'); 

        while (htmlConDatos) {  // bucle de paginacion
            console.log(`\nAnalizando tabla (Desde fila ${dt_first})...`);
            
            const documentos = Parserr.extraerTabla(htmlConDatos);

            if (documentos.length === 0) {
                console.log('No se extrajeron mas documentos. Scraping terminado');
                break;
            }

            console.log(`Se encontraron ${documentos.length} documentos listos para la descarga!!`);
            
            for (let i = 0; i < documentos.length; i++){
                const doc = documentos[i];
                const indiceAbsoluto = dt_first + i; 
                const nombreArchivo = doc.ruta_pdf.split('/').pop() || `doc_${indiceAbsoluto}.pdf`; 
                const filePath = path.join(outputDir, 'pdfs', nombreArchivo);
                

                // Importante ante interrupcion
                // Para no perder progreso y continuar scraping exactamente desde donde fue interrumpido
                if (fs.existsSync(filePath)) {
                    console.log(`Saltando [${indiceAbsoluto + 1}]: ${nombreArchivo} (Este documento ya esta disponible en disco)`);
                    totalDescargados++;
                    continue;
                }

                console.log(`\nProcesando [${indiceAbsoluto + 1}]: ${doc.metadatos.nro_resolucion}`); 
                const pdf_encontrado = await scraper.downloadPDF(indiceAbsoluto, doc.id_interno, nombreArchivo);

                if (pdf_encontrado) {
                    fs.appendFileSync(metadataPath, JSON.stringify(doc) + '\n');
                    totalDescargados++;
                    await new Promise(resolve => setTimeout(resolve, 1500));    //Tiempo de pause 
                } else{
                    console.error(`Error y no se descargo el documento ${doc.metadatos.nro_resolucion} continuando con el siguiente`);
                }
            }

            dt_first += 10;
            htmlConDatos = await scraper.obtenerPagina(dt_first);
        }

        console.log(`\nScraping exitoso! ✓✓✓ Total descargados: ${totalDescargados}`)
    }
}

main();