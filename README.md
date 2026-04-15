# Solución desafio de Scraping 
Repositorio de mi solución al desafio de scraping propuesto por Magnar. La web es la siguiente: 
[Ir a la web](https://publico.oefa.gob.pe/repdig/consulta/consultaTfa.xhtml)

## Enfoque usado
* Hacemos pre web scraping, navegando e inspeccionando la web con el propósito de identificar la información a extraer (`interface Documento`)
* Exploramos como se descargan los PDF desde el sitio
    
    * Este sitio utiliza el metodo POST y un formulario con una estructura definida. Por lo que se obtiene el body y headers del request
    

* Dejamos los PDFs ordenados la carpeta `data\pdfs` y datos correspondientes en `data\metadata.jsonl` con el propósito de optimizar su procesamiento en algun pipeline de inteligencia artificial

### Stack tecnológico
* Typescript
* Expresiones regulares con regex
* **Dependencias:**
    * Axios+CookiesJar
    * Cheerio

## Resultados

## Uso
Para ejecutar correctamente el Scraper

## 
