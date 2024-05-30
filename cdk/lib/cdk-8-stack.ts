import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";

import * as rds from "aws-cdk-lib/aws-rds";
import * as apigw from "aws-cdk-lib/aws-apigateway";

import { ParameterGroup, DatabaseInstanceEngine } from "aws-cdk-lib/aws-rds";
import { PostgresEngineVersion } from "aws-cdk-lib/aws-rds";
import path = require("path");

export class Cdk8Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "MyVPC", { maxAzs: 2 });

    vpc.addInterfaceEndpoint("SecretsManagerEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    const engine = DatabaseInstanceEngine.postgres({
      version: PostgresEngineVersion.VER_16_2,
    });

    const parameterGroup = new ParameterGroup(this, "parameter-group", {
      engine,
      parameters: {
        "rds.force_ssl": "0",
      },
    });

    const dbInstance = new rds.DatabaseInstance(this, "DBInstance", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      engine,
      parameterGroup,
      allocatedStorage: 20,
      backupRetention: cdk.Duration.days(0),
      deletionProtection: false,
      maxAllocatedStorage: 100,
      multiAz: false,
      publiclyAccessible: true, // Make it publicly accessible for simplicity
      storageType: rds.StorageType.GP2,
      databaseName: "mydb",
      credentials: rds.Credentials.fromGeneratedSecret("postgres"),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO
      ),
    });

    dbInstance.connections.allowFromAnyIpv4(ec2.Port.tcp(5432));

    // Create a new secret in Secrets Manager
    // const secret = new secretsmanager.Secret(this, "MySecret");

    // Create a new Lambda function and attach it to the VPC
    const fn = new lambda.Function(this, "MyFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("dist"),
      vpc,
      environment: {
        SECRET_ARN: dbInstance.secret?.secretArn || "",
      },
    });

    const nestJsFunction = new lambda.Function(this, "NestJsFunction", {
      vpc,
      environment: {
        SECRET_ARN: dbInstance.secret?.secretArn || "",
      },
      code: lambda.Code.fromAsset(
        path.resolve(__dirname, "../rs-cart-api.zip")
      ),
      handler: "dist/lambda.handler", // The exported handler in your entry point file
      runtime: lambda.Runtime.NODEJS_20_X,
      logRetention: cdk.aws_logs.RetentionDays.ONE_DAY,
      memorySize: 1256,
      timeout: cdk.Duration.seconds(5),
    });
    dbInstance.secret?.grantRead(nestJsFunction);

    new apigw.LambdaRestApi(this, "rest-api-gateway", {
      handler: nestJsFunction,
      restApiName: "NestJsApiGateway",
      proxy: true,
      deploy: true,
    });
  }
}
