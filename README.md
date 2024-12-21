# Static Website

This document contains notes and instructions for setting up and maintaining the static website for Carolina Lumpers Service.

## Overview
The static website is hosted on Google Cloud Platform (GCP) and serves as the public-facing portal for Carolina Lumpers Service. It includes:
- Information about services offered.
- Worker application forms.
- Contact and support details.

## Directory Structure
```
static_website/
├── index.html        # Main landing page
├── about.html        # About page
├── services.html     # Services offered
├── apply.html        # Application form for workers
├── assets/           # Images, CSS, and JavaScript files
└── README.md         # Documentation for the website
```

## Hosting on GCP

### Steps to Host
1. **Create a Cloud Storage Bucket**
   - Name: `carolina-lumpers-web`
   - Type: Regional (choose a region close to your audience).
   - Storage Class: Standard.

2. **Upload Website Files**
   Use the `gsutil` command-line tool to upload files:
   ```bash
   gsutil -m cp -r * gs://carolina-lumpers-web
   ```

3. **Enable Static Website Hosting**
   - Navigate to the bucket settings.
   - Enable static website hosting.
   - Set `index.html` as the default page.
   - Optionally, set `404.html` as the error page.

4. **Test the Website**
   - Access the website using the public URL provided by GCP (e.g., `https://storage.googleapis.com/carolina-lumpers-web/index.html`).

5. **Set Up a Custom Domain** (Optional)
   - Update DNS records to point to the GCP bucket.
   - Verify the domain in the GCP console.

## Maintenance
- Regularly update content by modifying `.html` files and uploading changes to the GCP bucket.
- Optimize images and assets to improve load times.
- Monitor website performance using GCP tools like **Cloud Monitoring**.

## Notes
- Use descriptive file names for better organization.
- Test changes locally before deploying.
- Back up all website files regularly.

## Contact
For questions or updates related to the static website, contact [Steve Garay](mailto:s.garay@carolinalumpers.com).

