FROM python:3.9-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN pip install --no-cache-dir pipenv

COPY Pipfile Pipfile.lock* ./
RUN pipenv install --system --deploy || pipenv install --system --skip-lock

COPY . .

EXPOSE 5002
CMD ["python", "run.py"]
