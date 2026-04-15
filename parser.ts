// Modularizacion del parser para usar cheerio (Data parsing)
import * as cheerio from 'cheerio';
import { Documento } from './scraper.js'; 

export class Parserr {
    
    public static extraerTabla(htmlCrudo: string): Documento[] {
        
        // Se filtran con expresiones regulares envoltorios CDATA del XML AJAX
        // esto es por el framework utilizado en la web PrimeFaces
        const htmlLimpio = htmlCrudo.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '');
        
        const parser = cheerio.load(htmlLimpio); // parser
        const documentosExtraidos: Documento[] = [];

        const filas = parser('tr[data-ri]'); // selector de atributos CSS clave para el cambio de página

        filas.each((indice, elemento) => {
            // Filtro que ignora filas vacias que el servidor envia cuando no hay resultados y evita colapse
            if (parser(elemento).hasClass('ui-datatable-empty-message')) return;

            const celdas = parser(elemento).find('td');

            // Extraccion de informacion y limpieza con trim()
            const nro = celdas.eq(0).text().trim();
            const expediente = celdas.eq(1).text().trim();
            const administrado = celdas.eq(2).text().trim();
            const unidadFiscalizable = celdas.eq(3).text().trim();
            const sector = celdas.eq(4).text().trim();
            const nroResolucion = celdas.eq(5).text().trim();

            // Extraccion del UUId oculto con expresiones regulares
            const onclickRaw = celdas.eq(6).find('a').attr('onclick') || '';
            const match = onclickRaw.match(/'param_uuid':'([^']+)'/); // solucion simple de aislar el uuid
            const uuid = match ? match[1] : '';

            if (nroResolucion && uuid) {
                // Se cambia el nombre del pdf para evitar errores de guardado
                const nombrePdfLimpio = nroResolucion.replace(/[\/\\]/g, '-');
                
                // Para limpieza y robustez en parametro Administrados
                const administradosArray = administrado.split('\n').map(a => a.trim()).filter(a => a !== '');

                // Construccion del diccionario
                documentosExtraidos.push({
                    id_interno: uuid,
                    metadatos: {
                        nro: nro,
                        nro_expediente: expediente,
                        nro_resolucion: nroResolucion
                    },
                    entidades: {
                        administrado: administradosArray,
                        unidad_fiscalizable: unidadFiscalizable
                    },
                    labels: {
                        sector: sector
                    },
                    ruta_pdf: `data/pdfs/${nombrePdfLimpio}.pdf`
                });
            }

        });

        return documentosExtraidos;
    }
}