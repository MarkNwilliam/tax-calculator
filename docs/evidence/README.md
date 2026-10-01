# Evidence

Captured terminal output from each stage, written by the CI workflow so the
submission has real output rather than a description of it.

| File | Stage |
|---|---|
| `01-jasmine-tests-passing` | `npx jasmine` - 7 specs, 0 failures |
| `01-jasmine-unit-tests.txt` | `npm run test:all` - the full 48-spec run |
| `02-dockerfile` | The nginx `Dockerfile` for the static container (6 lines) |
| `02-docker-build.txt` | `docker build -t tax-calculator:1.0.0 .` |
| `03-docker-image-details.txt` | image tags and `docker inspect` metadata |
| `04-docker-run.txt` | starting the container, logs, `docker ps` |
| `05-container-test.txt` | HTTP calls to the running container |
| `06-tekton-install.txt` | kind cluster, Tekton install, tasks and pipeline applied |
| `07-tekton-pipelinerun.txt` | the PipelineRun and its final status |
| `08-tekton-task-logs.txt` | logs for every task run |
| `09-tekton-deployed-app.txt` | calling the app the pipeline deployed |

Regenerate with the `CI` workflow (push to `main`, or run it manually).
