#!/bin/bash
# Build React app
cd client
npm run build-deploy
cd ..

# Collect static files
python demo/manage.py collectstatic --noinput

# Run server
python demo/manage.py runserver