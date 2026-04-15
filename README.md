# Solución desafio de Scraping 
Repositorio de mi solución al desafio de scraping a un portal web propuesto por [Magnar](https://www.magnar.ai/cl).

[Ir al portal web](https://publico.oefa.gob.pe/repdig/consulta/consultaTfa.xhtml)

## Enfoque
* Navegamos e inspeccionamos la web con el propósito de identificar la información a extraer (`interface Documento`). La web utiliza el framework JavaServer Faces

* Identificación de los request:

    * Para iniciar sesion se uso captura dinámica del token de seguridad. El servidor rota el ID del token en cada petición, por lo que se uso selectores CSS para capturar y filtro con **expresiones regulares**
    * Para simular el clic en el botón "Buscar", se utiliza una petición `POST` capturando el token de sesión base
    * Este sitio utiliza el metodo `POST` y un formulario con una estructura definida para la descarga de PDF. Por lo que se obtiene el body y headers requeridos por el servidor. Inyectando el índice de la fila y el UUID oculto del documento.
    * El cambio de página se logra simulando peticiones AJAX. La información de las nuevas tablas se extrae de bloques XML utilizando **expresiones regulares** para reconstruir los datos y los UUid de los PDF sin problema
    

* Los PDFs son ordenados en la carpeta `data/pdfs/` y datos correspondientes en `data/metadata.jsonl` con el propósito de optimizar su procesamiento en algun pipeline de inteligencia artificial

### Stack tecnológico
* Typescript
* Node.js
* Expresiones regulares
* **Dependencias principales**
    * Axios+CookiesJar
    * Cheerio

## Resultados
El scraper cumple con la extracción completa de los datos y documentos del portal bajo los siguientes entregables:

* Conjunto de datos estructurados en `data/metadata.jsonl`, normalizado para el uso de estos datos en algun modelo de ML
* Descarga masiva y orden de los PDF en carpeta `data/pdfs/`
* Robustez ante fallas, estabilidad ante bloqueos y rotación dinámica del token de sesión

Se tomo como referencia adicional para buenas prácticas y recomendaciones, el siguiente artículo:

[A Systematic Review of Web Scraping](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5429131)

## Uso
Para ejecutar correctamente el Scraper, son los siguientes pasos:
```
npm install
npm run start
```

> [!NOTA]
> El proyecto ha sido validado en entornos limpios para asegurar un flujo de ejecución totalmente reproducible y gestion de dependencias