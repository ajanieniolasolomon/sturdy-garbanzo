# MongoDB Atlas Setup Guide for CCMIS

## Step 1: Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Click "Try Free" or "Sign Up"
3. Create your account with email and password

## Step 2: Create a New Cluster

1. **Choose Cloud Provider**: Select AWS, Google Cloud, or Azure
2. **Choose Region**: Select a region close to your cPanel server
3. **Cluster Tier**: Choose "M0 Sandbox" (Free tier) for development
4. **Cluster Name**: Give it a name like "ccmis-cluster"
5. Click "Create Cluster"

## Step 3: Create Database User

1. Go to "Database Access" in the left sidebar
2. Click "Add New Database User"
3. **Authentication Method**: Choose "Password"
4. **Username**: Create a username (e.g., "ccmis-user")
5. **Password**: Generate a secure password (save this!)
6. **Database User Privileges**: Choose "Read and write to any database"
7. Click "Add User"

## Step 4: Configure Network Access

1. Go to "Network Access" in the left sidebar
2. Click "Add IP Address"
3. **Access List Entry**: 
   - For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
   - For production: Add your cPanel server's IP address
4. Click "Confirm"

## Step 5: Get Connection String

1. Go to "Clusters" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. **Driver**: Node.js
5. **Version**: 4.1 or later
6. Copy the connection string

## Step 6: Update Connection String

Replace the connection string with your actual credentials:

```
mongodb+srv://<username>:<password>@ccmis-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

Replace:
- `<username>` with your database username
- `<password>` with your database password
- `ccmis-cluster.xxxxx.mongodb.net` with your actual cluster URL

## Step 7: Add Database Name

Add your database name to the connection string:

```
mongodb+srv://<username>:<password>@ccmis-cluster.xxxxx.mongodb.net/ccmis_prod?retryWrites=true&w=majority
```

## Step 8: Test Connection

You can test the connection using MongoDB Compass or by running your application.

## Security Best Practices

1. **Use Strong Passwords**: Generate secure passwords for database users
2. **IP Whitelisting**: Only allow access from your server's IP address
3. **Regular Backups**: Enable automatic backups
4. **Monitor Access**: Check the "Database Access" logs regularly
5. **Use Environment Variables**: Never hardcode credentials in your code

## Troubleshooting

### Connection Issues
- Check if your IP address is whitelisted
- Verify username and password are correct
- Ensure the cluster is running
- Check if the connection string is properly formatted

### Authentication Errors
- Verify the database user has the correct privileges
- Check if the password contains special characters that need encoding
- Ensure the username and password are correct

### Network Issues
- Check if your server's IP address is whitelisted
- Verify firewall settings
- Check if the cluster is accessible from your region

## Production Considerations

1. **Upgrade Cluster**: Use a paid tier for production workloads
2. **Enable Encryption**: Use encryption at rest and in transit
3. **Set Up Monitoring**: Enable MongoDB Atlas monitoring
4. **Configure Alerts**: Set up alerts for performance issues
5. **Regular Backups**: Ensure automatic backups are enabled
6. **Security**: Use VPC peering for enhanced security

## Cost Optimization

1. **Free Tier**: Use M0 Sandbox for development and testing
2. **Paid Tiers**: Upgrade to M10 or higher for production
3. **Storage**: Monitor storage usage and optimize as needed
4. **Data Transfer**: Be aware of data transfer costs

## Support

- **Documentation**: [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- **Community**: [MongoDB Community Forums](https://community.mongodb.com/)
- **Support**: Contact MongoDB support for paid plans
