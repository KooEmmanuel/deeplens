# DeepLens

DeepLens is an advanced application designed to empower users with deep research capabilities over their local documents. Leveraging both a custom deepseek model and powerful OpenAI models, DeepLens analyzes your files to extract summaries, key topics, and insightful questions. Whether you're looking to perform document analysis or engage in interactive chats with AI, DeepLens has you covered.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
  - [Cloning the Repository](#cloning-the-repository)
  - [Ollama Model Setup](#ollama-model-setup)
  - [(Optional) OpenAI API Key Setup](#optional-openai-api-key-setup)
  - [Running via Docker Compose](#running-via-docker-compose)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Introduction

DeepLens is built to help users perform deep research on their local documents. It does so by integrating:
- The **deepseek** model: A custom model fine-tuned for deep document analysis.
- **OpenAI Models**: Such as GPT-3.5 Turbo and GPT-4o for conversational and analytical capabilities.

With an intuitive user interface, you can upload files, initiate chat-based queries, and receive detailed analysis—all within a Dockerized environment for easy deployment.

## Features

- **Document Analysis & Research:**  
  Upload and analyze local files to extract main topics, summaries, and generate questions.
  
- **Chat-Based Interaction:**  
  Ask questions and interact with the AI via a sleek chat interface.
  
- **Multi-Model Support:**  
  Choose between the deepseek model and popular OpenAI models based on your research needs.
  
- **Dockerized Deployment:**  
  Build and deploy both frontend and backend services easily using Docker.
  
- **User-Friendly Dashboard:**  
  Manage conversations and document uploads with a convenient sidebar interface.

## Requirements

- **Docker:** Ensure Docker is installed and running.
- **Ollama:** For using the `deepseek-r1:1.5b` model, you must download and install Ollama.
- **Git:** To clone the repository.
- **Node.js & npm/yarn (optional):** For local development if you choose not to deploy with Docker.

## Installation

### Cloning the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/KooEmmanuel/deeplens.git
cd deeplens
```

### Ollama Model Setup

To utilize the deep analysis capabilities provided by the deepseek model, you must have **Ollama** installed.

1. **Download and Install Ollama:**  
   Visit the [Ollama website](https://ollama.com) and download the installer for your operating system. Follow the installation instructions provided on the site.

2. **Pull the Deepseek Model:**  
   Once Ollama is installed, open a terminal and run:
   ```bash
   ollama pull deepseek-r1:1.5b
   ```
   This command downloads the required deepseek model for document analysis.

### (Optional) OpenAI API Key Setup

If you wish to use OpenAI models along with the deepseek model, follow these steps:

1. **Create an API Key:**  
   Visit [OpenAI API Keys](https://platform.openai.com/account/api-keys) to create a new API key. Sign in or sign up if needed.

2. **Configure the API Key:**  
   You can configure your API key in the application by opening the settings modal within the app. Alternatively, if your deployment supports environment variables, you could set the `OPENAI_API_KEY` accordingly.

### Running via Docker Compose

The Docker images for both the frontend and backend are already built. You can quickly spin up the entire application using the Docker Compose file provided in the repository.

1. **Ensure Docker and Docker Compose are installed** on your system.

2. **Run the Application:**
   - Open a terminal in the project directory.
   - Execute the following command:
     ```bash
     docker-compose up
     ```
   - To run the containers in detached mode, use:
     ```bash
     docker-compose up -d
     ```

The Docker Compose file will start both the frontend and backend services, allowing you to access the application in your browser (by default at `http://localhost:3000`).

## Usage

- **Access the Application:**  
  After starting the Docker containers, open your browser and navigate to `http://localhost:3000`.

- **Chat Interface:**  
  Use the powerful chat interface to ask questions about your uploaded documents. The app will process your query using your selected model.

- **Document Upload & Analysis:**  
  Upload documents via the sidebar. DeepLens will extract insights and key topics from your files.

- **Settings:**  
  Configure your API key and model preferences using the built-in settings modal.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch with descriptive naming.
3. Implement your changes and test thoroughly.
4. Open a pull request with a detailed explanation of your modifications.

For larger changes, consider opening an issue to discuss your ideas first.

## License

This project is licensed under the [Apache License](LICENSE).

---

DeepLens leverages advanced AI models to deliver deep research and intuitive document analysis. Whether you're a researcher, developer, or enthusiast, DeepLens equips you with the tools to extract valuable insights from your local files.

Happy Deep Researching!



