# Vertex AI and Google Cloud Storage Setup Guide

This guide provides step-by-step instructions for setting up Google Cloud Platform (GCP) to use **Vertex AI Gemini models** and **Google Cloud Storage** with the Vision MCP Server.

## What This Guide Sets Up

This guide will configure your Google Cloud environment with:

- ✅ **Vertex AI API Access** - Enables calling Gemini models (gemini-2.5-pro, gemini-2.5-flash, gemini-2.5-flash-lite, etc.)
- ✅ **Google Cloud Storage** - Storage bucket for video files and large images
- ✅ **Service Account** - Secure authentication with proper IAM permissions
- ✅ **Unified Credentials** - Single credential file for both Vertex AI and GCS access

## Prerequisites

- Google Cloud account with billing enabled
- Access to Google Cloud Console or Cloud Shell
- `gcloud` CLI installed (pre-installed in Cloud Shell)

## Table of Contents

1. [Initial Setup](#1-initial-setup)
2. [Create or Select a Project](#2-create-or-select-a-project)
3. [Enable Required APIs](#3-enable-required-apis)
4. [Create a GCS Bucket](#4-create-a-gcs-bucket)
5. [Create a Service Account](#5-create-a-service-account)
6. [Grant Required Permissions](#6-grant-required-permissions)
7. [Generate and Download Credentials](#7-generate-and-download-credentials)
8. [Verify Setup](#8-verify-setup)
9. [Using Existing Service Account](#9-using-existing-service-account)
10. [Troubleshooting](#10-troubleshooting)

---

## 1. Initial Setup

Open Google Cloud Shell by clicking the terminal icon in the top-right corner of the Google Cloud Console, or use your local terminal with `gcloud` CLI installed.

### Authenticate with Google Cloud

```bash
# Login to Google Cloud (skip if using Cloud Shell)
gcloud auth login

# Set default account (if you have multiple accounts)
gcloud config set account YOUR_EMAIL@example.com
```

---

## 2. Create or Select a Project

### Option A: Create a New Project

```bash
# Set your project name and ID
export PROJECT_ID="ai-vision-mcp-$(date +%s)"
export PROJECT_NAME="AI Vision MCP Server"

# Create the project
gcloud projects create $PROJECT_ID \
  --name="$PROJECT_NAME" \
  --set-as-default

# Link billing account (required for Vertex AI)
# First, list available billing accounts
gcloud billing accounts list

# Link billing to project (replace BILLING_ACCOUNT_ID)
export BILLING_ACCOUNT_ID="YOUR-BILLING-ACCOUNT-ID"
gcloud billing projects link $PROJECT_ID \
  --billing-account=$BILLING_ACCOUNT_ID
```

### Option B: Use an Existing Project

```bash
# List all projects
gcloud projects list

# Set the project ID
export PROJECT_ID="your-existing-project-id"

# Set as default project
gcloud config set project $PROJECT_ID
```

### Verify Project Setup

```bash
# Confirm current project
gcloud config get-value project

# View project details
gcloud projects describe $PROJECT_ID
```

---

## 3. Enable Required APIs

Enable the necessary Google Cloud APIs for Vertex AI and Cloud Storage:

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable Cloud Storage API
gcloud services enable storage-api.googleapis.com
gcloud services enable storage-component.googleapis.com

# Enable IAM API (for service account management)
gcloud services enable iam.googleapis.com

# Enable Service Usage API
gcloud services enable serviceusage.googleapis.com

# Verify enabled services
gcloud services list --enabled | grep -E "aiplatform|storage|iam"
```

**Expected output:**
```
aiplatform.googleapis.com          Vertex AI API
iam.googleapis.com                 Identity and Access Management (IAM) API
storage-api.googleapis.com         Google Cloud Storage JSON API
storage-component.googleapis.com   Cloud Storage
```

---

## 4. Create a GCS Bucket

Create a Google Cloud Storage bucket for storing video files and large images:

```bash
# Set bucket name (must be globally unique)
export BUCKET_NAME="ai-vision-mcp-${PROJECT_ID}"

# Set bucket location (choose one near your Vertex AI location)
# Options: us-central1, us-east1, europe-west1, asia-southeast1, etc.
export BUCKET_LOCATION="us-central1"

# Create the bucket
gcloud storage buckets create gs://$BUCKET_NAME \
  --location=$BUCKET_LOCATION \
  --uniform-bucket-level-access

# Verify bucket creation
gcloud storage buckets describe gs://$BUCKET_NAME

# Set lifecycle policy (optional - auto-delete files after 7 days)
cat > lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 7}
      }
    ]
  }
}
EOF

gcloud storage buckets update gs://$BUCKET_NAME \
  --lifecycle-file=lifecycle.json

rm lifecycle.json
```

### Verify Bucket Access

```bash
# Test bucket access by uploading a test file
echo "test" > test.txt
gcloud storage cp test.txt gs://$BUCKET_NAME/
gcloud storage ls gs://$BUCKET_NAME/
gcloud storage rm gs://$BUCKET_NAME/test.txt
rm test.txt
```

---

## 5. Create a Service Account

Create a dedicated service account for the Vision MCP Server:

```bash
# Set service account name
export SA_NAME="ai-vision-mcp-sa"
export SA_DISPLAY_NAME="AI Vision MCP Service Account"
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --display-name="$SA_DISPLAY_NAME" \
  --description="Service account for AI Vision MCP Server to access Vertex AI and Cloud Storage"

# Verify service account creation
gcloud iam service-accounts list | grep $SA_NAME

# View service account details
gcloud iam service-accounts describe $SA_EMAIL
```

---

## 6. Grant Required Permissions

Grant the necessary IAM roles to the service account for **both Vertex AI and Cloud Storage** access:

### Grant Vertex AI User Role (for Gemini API Access)

This role allows the service account to call Vertex AI APIs including all Gemini models:

```bash
# Grant Vertex AI User role (enables calling Gemini models via Vertex AI)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user"

echo "✓ Granted Vertex AI User role - Service account can now call Gemini models"
```

**What this enables:**
- Call Gemini models: `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-pro-vision`
- Generate content with text and multimodal inputs
- Use Vertex AI prediction and generation endpoints

### Grant Cloud Storage Permissions

This allows the service account to upload, download, and manage files in the GCS bucket:

```bash
# Grant Storage Object Admin role for the bucket (recommended - bucket-level access)
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

echo "✓ Granted Storage Object Admin role - Service account can manage files in bucket"

# Alternative: Grant Storage Admin role at project level (broader permissions - not recommended)
# Uncomment only if you need access to all buckets in the project:
# gcloud projects add-iam-policy-binding $PROJECT_ID \
#   --member="serviceAccount:${SA_EMAIL}" \
#   --role="roles/storage.admin"
```

**What this enables:**
- Upload video files and large images to GCS
- Download and read files from the bucket
- Delete temporary files after processing
- Generate signed URLs for secure access

### Optional: Additional Vertex AI Permissions

For advanced use cases, you may need additional roles:

```bash
# Grant Vertex AI Admin role (for model deployment, endpoint management)
# Only needed if you plan to deploy custom models
# gcloud projects add-iam-policy-binding $PROJECT_ID \
#   --member="serviceAccount:${SA_EMAIL}" \
#   --role="roles/aiplatform.admin"

# Grant Vertex AI Feature Store User (for feature engineering)
# Only needed if using Vertex AI Feature Store
# gcloud projects add-iam-policy-binding $PROJECT_ID \
#   --member="serviceAccount:${SA_EMAIL}" \
#   --role="roles/aiplatform.featurestoreUser"
```

### Verify Permissions

```bash
# Check service account permissions for the project
echo "Checking Vertex AI permissions..."
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}" \
  --format="table(bindings.role)"

# Check bucket-level permissions
echo ""
echo "Checking GCS permissions..."
gcloud storage buckets get-iam-policy gs://$BUCKET_NAME \
  --format=json | jq -r \
  --arg sa "serviceAccount:${SA_EMAIL}" \
  '.bindings[] | select(.members[]? == $sa) | .role'

# Expected roles:
# - roles/aiplatform.user (for Vertex AI / Gemini)
# - roles/storage.objectAdmin (for GCS bucket)
```

---

## 7. Generate and Download Credentials

Create and download the service account key file:

```bash
# Set credentials file path
export CREDENTIALS_FILE="vertex-ai-credentials.json"

# Create key and download
gcloud iam service-accounts keys create $CREDENTIALS_FILE \
  --iam-account=$SA_EMAIL

# Verify key creation
ls -lh $CREDENTIALS_FILE

# View key details (without exposing the private key)
gcloud iam service-accounts keys list \
  --iam-account=$SA_EMAIL
```

### Security Best Practices

```bash
# Set restrictive permissions on credentials file
chmod 600 $CREDENTIALS_FILE

# IMPORTANT: Keep this file secure and never commit to version control!
# Add to .gitignore if not already there
echo "$CREDENTIALS_FILE" >> .gitignore

# For Cloud Shell, download the file to your local machine:
# Click the "Download" button in Cloud Shell or use this command:
cloudshell download $CREDENTIALS_FILE
```

---

## 8. Verify Setup

Test that everything is configured correctly:

```bash
# Set credentials for testing
export GOOGLE_APPLICATION_CREDENTIALS="$PWD/$CREDENTIALS_FILE"

# Test Vertex AI API access
echo "Testing Vertex AI API access..."
gcloud ai models list \
  --region=$BUCKET_LOCATION \
  --project=$PROJECT_ID 2>/dev/null && \
  echo "✓ Vertex AI API access verified" || \
  echo "✗ Vertex AI API access failed"

# Test Gemini model access specifically
cat > test_gemini_access.py << 'EOF'
import vertexai
from vertexai.generative_models import GenerativeModel
import sys

try:
    # Initialize Vertex AI
    vertexai.init(project=sys.argv[1], location=sys.argv[2])

    # Try to load a Gemini model
    model = GenerativeModel("gemini-2.5-flash-lite")

    # Test a simple generation
    response = model.generate_content("Say 'hello'")

    print("✓ Gemini model access successful!")
    print(f"  Project: {sys.argv[1]}")
    print(f"  Location: {sys.argv[2]}")
    print(f"  Model: gemini-2.5-flash-lite")
    print(f"  Response: {response.text[:50]}...")
except Exception as e:
    print(f"✗ Gemini model access failed: {e}")
    sys.exit(1)
EOF

python3 test_gemini_access.py $PROJECT_ID $BUCKET_LOCATION

# Test Vertex AI access (legacy method for compatibility)
cat > test_vertex_ai.py << 'EOF'
from google.cloud import aiplatform
import sys

try:
    aiplatform.init(project=sys.argv[1], location=sys.argv[2])
    print("✓ Vertex AI connection successful!")
    print(f"  Project: {sys.argv[1]}")
    print(f"  Location: {sys.argv[2]}")
except Exception as e:
    print(f"✗ Vertex AI connection failed: {e}")
    sys.exit(1)
EOF

python3 test_vertex_ai.py $PROJECT_ID $BUCKET_LOCATION

# Test GCS access
cat > test_gcs.py << 'EOF'
from google.cloud import storage
import sys

try:
    client = storage.Client()
    bucket = client.bucket(sys.argv[1])

    # Test write
    blob = bucket.blob("test-file.txt")
    blob.upload_from_string("test")

    # Test read
    content = blob.download_as_text()

    # Test delete
    blob.delete()

    print("✓ Google Cloud Storage access successful!")
    print(f"  Bucket: {sys.argv[1]}")
except Exception as e:
    print(f"✗ GCS access failed: {e}")
    sys.exit(1)
EOF

python3 test_gcs.py $BUCKET_NAME

# Cleanup test files
rm test_gemini_access.py test_vertex_ai.py test_gcs.py
```

### Summary of Configuration

```bash
# Display configuration summary
cat << EOF

========================================
  Setup Complete! 🎉
========================================

Project Information:
  Project ID:      $PROJECT_ID
  Project Number:  $(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

Service Account:
  Email:           $SA_EMAIL
  Credentials:     $CREDENTIALS_FILE

Permissions Granted:
  ✓ Vertex AI User - Can call Gemini models via Vertex AI
  ✓ Storage Object Admin - Can manage files in GCS bucket

Storage:
  Bucket Name:     $BUCKET_NAME
  Bucket Location: $BUCKET_LOCATION

Available Gemini Models:
  - gemini-2.5-flash
  - gemini-2.5-flash-lite
  - gemini-pro-vision

Next Steps:
  1. Download the credentials file to your local machine
  2. Set environment variables in your .env file:

     VERTEX_CREDENTIALS=$CREDENTIALS_FILE
     GCS_BUCKET_NAME=$BUCKET_NAME
     VERTEX_LOCATION=$BUCKET_LOCATION

  3. Start using the AI Vision MCP Server with Vertex AI!

========================================
EOF
```

---

## 9. Using Existing Service Account

If you already have a service account, you can reuse it:

```bash
# List existing service accounts
gcloud iam service-accounts list

# Set existing service account email
export SA_EMAIL="your-existing-sa@your-project.iam.gserviceaccount.com"

# Grant required roles (if not already granted)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user"

gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"

# Create new key (or use existing one)
gcloud iam service-accounts keys create vertex-ai-credentials.json \
  --iam-account=$SA_EMAIL
```

---

## 10. Troubleshooting

### Common Issues and Solutions

#### Issue: "Permission denied" when accessing Vertex AI

```bash
# Check if Vertex AI API is enabled
gcloud services list --enabled | grep aiplatform

# If not enabled, run:
gcloud services enable aiplatform.googleapis.com

# Verify service account has correct role
gcloud projects get-iam-policy $PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:${SA_EMAIL}"
```

#### Issue: "Bucket not found" or permission errors

```bash
# Verify bucket exists
gcloud storage buckets list | grep $BUCKET_NAME

# Check bucket permissions
gcloud storage buckets get-iam-policy gs://$BUCKET_NAME

# Grant permissions if missing
gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin"
```

#### Issue: "Billing not enabled"

```bash
# Check billing status
gcloud billing projects describe $PROJECT_ID

# Link billing account
gcloud billing accounts list
gcloud billing projects link $PROJECT_ID \
  --billing-account=BILLING_ACCOUNT_ID
```

#### Issue: Service account key not working

```bash
# Verify key file is valid JSON
cat $CREDENTIALS_FILE | python3 -m json.tool > /dev/null && echo "Valid JSON" || echo "Invalid JSON"

# Check if key is active
gcloud iam service-accounts keys list --iam-account=$SA_EMAIL

# If needed, create a new key and disable old ones
gcloud iam service-accounts keys create new-key.json \
  --iam-account=$SA_EMAIL

# List and delete old keys (replace KEY_ID)
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=$SA_EMAIL
```

### Quota and Limits

```bash
# Check Vertex AI quotas
gcloud compute project-info describe --project=$PROJECT_ID

# Request quota increase if needed (via Cloud Console)
# https://console.cloud.google.com/iam-admin/quotas
```

### Clean Up Resources

If you need to remove the resources:

```bash
# Delete service account key
gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=$SA_EMAIL

# Delete service account
gcloud iam service-accounts delete $SA_EMAIL

# Delete bucket (WARNING: This deletes all files)
gcloud storage rm -r gs://$BUCKET_NAME

# Disable APIs (optional)
gcloud services disable aiplatform.googleapis.com
gcloud services disable storage-api.googleapis.com
```

---

## Additional Resources

- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)

---

## Quick Setup Script

For convenience, here's a complete setup script:

```bash
#!/bin/bash
# quick-setup.sh - Quick setup for Vertex AI Vision MCP Server

set -e

echo "=== Vertex AI Vision MCP Server - Google Cloud Setup ==="

# Configuration
read -p "Enter Project ID (or press Enter to create new): " PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID="ai-vision-mcp-$(date +%s)"
  echo "Creating new project: $PROJECT_ID"
  gcloud projects create $PROJECT_ID --name="AI Vision MCP Server"
fi

gcloud config set project $PROJECT_ID

# Enable APIs
echo "Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com \
  storage-api.googleapis.com \
  storage-component.googleapis.com \
  iam.googleapis.com

# Create bucket
BUCKET_NAME="ai-vision-mcp-${PROJECT_ID}"
BUCKET_LOCATION="us-central1"
echo "Creating GCS bucket: $BUCKET_NAME"
gcloud storage buckets create gs://$BUCKET_NAME \
  --location=$BUCKET_LOCATION \
  --uniform-bucket-level-access

# Create service account
SA_NAME="ai-vision-mcp-sa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
echo "Creating service account: $SA_EMAIL"
gcloud iam service-accounts create $SA_NAME \
  --display-name="AI Vision MCP Service Account"

# Grant permissions
echo "Granting permissions..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/aiplatform.user" \
  --quiet

gcloud storage buckets add-iam-policy-binding gs://$BUCKET_NAME \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.objectAdmin" \
  --quiet

# Create credentials
CREDENTIALS_FILE="vertex-ai-credentials.json"
echo "Creating credentials file: $CREDENTIALS_FILE"
gcloud iam service-accounts keys create $CREDENTIALS_FILE \
  --iam-account=$SA_EMAIL

chmod 600 $CREDENTIALS_FILE

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Configuration:"
echo "  VERTEX_CREDENTIALS=$CREDENTIALS_FILE"
echo "  GCS_BUCKET_NAME=$BUCKET_NAME"
echo "  VERTEX_LOCATION=$BUCKET_LOCATION"
echo ""
echo "Add these to your .env file to get started!"
```

Save this script and run:

```bash
chmod +x quick-setup.sh
./quick-setup.sh
```
