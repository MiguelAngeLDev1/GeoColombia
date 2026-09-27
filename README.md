\# GeoColombia



GeoColombia es una API geoespacial construida con \*\*Python y FastAPI\*\* para centralizar y consultar información territorial de Colombia proveniente de fuentes oficiales.



El objetivo del proyecto es permitir que una aplicación pueda consultar una ubicación geográfica y obtener, mediante una única interfaz, información relevante asociada a ese territorio.



\## Funcionalidades actuales



\### Servicio Geológico Colombiano (SGC)



Integración con el catálogo sísmico del Servicio Geológico Colombiano.



Permite:



\- Consultar eventos sísmicos.

\- Buscar sismos alrededor de una coordenada.

\- Definir un radio de búsqueda en kilómetros.

\- Calcular la distancia entre el punto consultado y cada evento.

\- Ordenar los eventos desde el más cercano al más lejano.



\### Agencia Nacional de Minería (ANM)



Integración con servicios geográficos de la Agencia Nacional de Minería.



Permite consultar títulos mineros que intersectan una coordenada determinada y obtener información como:



\- Código del expediente.

\- Área.

\- Estado.

\- Modalidad.

\- Etapa.

\- Minerales.

\- Departamento.

\- Municipio.



\### Contexto territorial



GeoColombia combina diferentes fuentes en una sola consulta.



Por ejemplo:



```http

GET /api/v1/location/context?latitude=8.3665\&longitude=-72.86\&radius\_km=50

```



La respuesta contiene información minera correspondiente al punto consultado y eventos sísmicos encontrados alrededor de la ubicación.



\## Arquitectura



```text

&#x20;                    GeoColombia API

&#x20;                          |

&#x20;                      FastAPI

&#x20;                          |

&#x20;             +------------+------------+

&#x20;             |                         |

&#x20;            SGC                       ANM

&#x20;             |                         |

&#x20;      Catálogo sísmico          Títulos mineros

&#x20;             |                         |

&#x20;             +------------+------------+

&#x20;                          |

&#x20;                 Contexto territorial

```



La aplicación está organizada por responsabilidades:



```text

backend/app/

├── api/            # Endpoints HTTP

├── core/           # Excepciones y manejo de errores

├── integrations/   # Clientes de servicios externos

│   ├── anm/

│   └── sgc/

├── schemas/        # Modelos Pydantic

├── services/       # Lógica de negocio

└── main.py         # Aplicación FastAPI

```



\## Tecnologías



\- Python 3.12

\- FastAPI

\- Pydantic

\- HTTPX

\- Pytest

\- Docker



\## Ejecución local



Ubicarse en el backend:



```bash

cd backend

```



Crear un entorno virtual:



```bash

python -m venv .venv

```



Activarlo en Windows:



```powershell

.venv\\Scripts\\Activate.ps1

```



Instalar las dependencias:



```bash

pip install -r requirements-dev.txt

```



Ejecutar la API:



```bash

uvicorn app.main:app --reload

```



La documentación interactiva estará disponible en:



```text

http://localhost:8000/docs

```



\## Docker



Construir la imagen desde la raíz del proyecto:



```bash

docker build -t geocolombia-api:dev ./backend

```



Ejecutar:



```bash

docker run --rm --name geocolombia-api -p 8000:8000 geocolombia-api:dev

```



La API estará disponible en el puerto `8000`.



\## Tests



Desde `backend`:



```bash

python -m pytest -v

```



Actualmente el proyecto cuenta con pruebas automatizadas para las integraciones y servicios principales.



\## Estado del proyecto



GeoColombia se encuentra en desarrollo activo.



Actualmente están implementadas las primeras integraciones con:



\- Servicio Geológico Colombiano.

\- Agencia Nacional de Minería.

\- Consulta unificada de contexto territorial.



La arquitectura está preparada para incorporar nuevas fuentes geoespaciales y ambientales de Colombia.



\## Próximos pasos



\- Despliegue cloud en Azure.

\- CI/CD.

\- Incorporación de nuevas fuentes oficiales.

\- Interfaz web basada en mapas.

\- Consulta territorial interactiva por ubicación.

