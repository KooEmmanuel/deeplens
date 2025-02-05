# DeepLens

DeepLens is an advanced application designed to empower users with deep research capabilities over their local documents. Leveraging both a custom deepseek model and powerful conversational models, DeepLens analyzes your files to extract summaries, key topics, and insightful questions. With an intuitive user interface, you can upload files, chat with the AI, and now even visually edit your document content using the new Canvas Editor.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Cloning the Repository](#cloning-the-repository)
  - [Docker Build & Deployment](#docker-build--deployment)
  - [Ollama Model Setup](#ollama-model-setup)
  - [(Optional) OpenAI API Key Setup](#optional-openai-api-key-setup)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Introduction

DeepLens is built to help users perform deep research on local documents. It integrates:
- The **deepseek** model for deep document analysis.
- **Open Source Models** like Qwen for interactive analysis.
- **Chat-Based AI** that can answer questions and generate insights.
- The **new Canvas Editor** powered by Editor.js for visual document editing.

All services are Dockerized, allowing you to easily deploy a complete environment that includes both frontend and backend services.

## Features

- **Document Analysis & Research:**  
  Upload and analyze local files to extract main topics, summaries, and generate questions.
  
- **Chat-Based Interaction:**  
  Use the powerful chat interface to ask questions and interact with the AI.
  
- **Multi-Model Support:**  
  Choose between deepseek, Qwen (open source), and optionally GPT-3.5 Turbo (requires OpenAI API Key) models.
  
- **Canvas Editor:**  
  A newly added visual editor that allows you to create, edit, and download documents as HTML. Enhance your document editing with a rich, block‑based interface powered by Editor.js.
  
- **Dockerized Deployment:**  
  Easily build and deploy both the frontend and backend services using Docker Compose.

## Requirements

- **Docker:**  
  Ensure Docker and Docker Compose are installed on your system.  
  - [Install Docker](https://docs.docker.com/get-docker/)
  - [Install Docker Compose](https://docs.docker.com/compose/install/)

- **Ollama:**  
  Required for running the deep analysis models.
  - Download and install from [Ollama Website](https://ollama.com).

- **Ollama Models:**  
  - `deepseek-r1:1.5b` for document analysis.
  - `qwen` for open source conversational interactions.

- **(Optional) OpenAI API Key:**  
  To enable GPT-3.5 Turbo capabilities, get your API key from [OpenAI API Keys](https://platform.openai.com/account/api-keys) and configure it either via the application settings or by setting the `OPENAI_API_KEY` environment variable.

## Installation

### Cloning the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/KooEmmanuel/deeplens.git
cd deeplens
```

### Docker Build & Deployment

1. **Ensure Docker and Docker Compose are installed.**

2. **Build the Docker Images:**

   ```bash
   docker-compose build
   ```

3. **Start the Application:**

   - To run all services in the foreground:

     ```bash
     docker-compose up
     ```

   - To run the containers in detached mode:

     ```bash
     docker-compose up -d
     ```

4. **Download Docker Compose File:**  
   You can also download the `docker-compose.yml` file from the repository and run the above commands to quickly spin up the application.

### Ollama Model Setup

1. **Download and Install Ollama:**  
   Visit [Ollama Website](https://ollama.com) and follow the provided installation instructions.

2. **Start the Required Models:**

   Open a terminal and run:

   ```bash
   ollama run deepseek-r1:1.5b
   ollama run qwen
   ```

   This will initialize the deep document model and the Qwen conversational model.

### (Optional) OpenAI API Key Setup

If you prefer to use the GPT-3.5 model:
1. Get your API key from [OpenAI API Keys](https://platform.openai.com/account/api-keys).
2. Configure the API key through the application settings modal or set the `OPENAI_API_KEY` environment variable.

## Usage

- **Access the Application:**  
  After the Docker containers are running, open your browser and navigate to `http://localhost:3000`.

- **Chat Interface:**  
  Use the chat interface to ask questions and interact with the AI about your documents.

- **Canvas Editor:**  
  Open the Canvas Editor from the main application interface. The Canvas Editor allows you to visually compose and edit documents, then download your edited content as an HTML file.

- **Document Upload & Analysis:**  
  Upload documents via the sidebar for in-depth analysis and visualization.

- **Settings:**  
  Configure API keys and select your preferred models using the built-in settings modal.

## Contributing

Contributions are welcome! Please:
1. Fork the repository.
2. Create a new branch with a descriptive name.
3. Implement, test, and document your changes.
4. Submit a pull request with detailed explanations.

For major changes, consider opening an issue first for discussion.

## License

This project is licensed under the [Apache License](LICENSE).

---

DeepLens leverages advanced models and a user-friendly interface to provide deep document analysis and chat-based interactions, now with an enhanced visual editing capability using the Canvas Editor. Whether you're a researcher, developer, or enthusiast, DeepLens equips you with the tools to extract valuable insights from your local files.

Happy Deep Researching!



