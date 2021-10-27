import { S3, config as awsConfig } from 'aws-sdk';

awsConfig.update({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
  }
})

export function  objectRefs(href: string): { Bucket: string, Key: string, [ name: string ]: any } {
  const url = require('url').parse(href);

  return {
    Bucket: url.host as string,
    Key: (url.pathname as string).substr(1),
    ...require('querystring').parse(url.query)
  } as any
}

export const s3  = new S3();
