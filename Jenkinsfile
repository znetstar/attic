node('thirdact') {
    checkout scm

    docker.withRegistry('https://436994747461.dkr.ecr.us-east-1.amazonaws.com', 'ecr:us-east-1:zb-network') {
      withCredentials([[
        $class: 'AmazonWebServicesCredentialsBinding',
        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
        credentialsId: 'zb-network',
        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
      ]]) {
         sh "AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID}' AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY}' aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws/znetstar"
         sh 'docker buildx create --use'
         sh "docker buildx build --platform linux/arm64 --push --build-arg AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID}' --build-arg AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY}' --build-arg NODE_OPTIONS=--max_old_space_size=78643 -t public.ecr.aws/znetstar/attic-server:\$(bash get-version.sh) ./attic/attic-server"
         sh "docker build --build-arg AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID}' --build-arg AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY}' --build-arg NODE_OPTIONS=--max_old_space_size=78643 -t public.ecr.aws/znetstar/attic-server:latest ./attic/attic-server"
         sh 'docker push public.ecr.aws/znetstar/attic-server:latest'
      }
    }

    docker.withRegistry('https://981470858920.dkr.ecr.us-east-1.amazonaws.com', 'ecr:us-east-1:thirdact') {
      withCredentials([[
        $class: 'AmazonWebServicesCredentialsBinding',
        accessKeyVariable: 'AWS_ACCESS_KEY_ID',
        credentialsId: 'thirdact',
        secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
      ]]) {
          sh "AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID}' AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY}' aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 981470858920.dkr.ecr.us-east-1.amazonaws.com"
          sh 'docker buildx create --use'
          sh "docker buildx build --build-arg AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID}' --build-arg AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY}' --platform linux/arm64 --push --build-arg NODE_OPTIONS=--max_old_space_size=78643 -t 981470858920.dkr.ecr.us-east-1.amazonaws.com/thirdact-attic:\$(bash get-version.sh) ./"
          sh "AWS_ACCESS_KEY_ID='${AWS_ACCESS_KEY_ID}' AWS_SECRET_ACCESS_KEY='${AWS_SECRET_ACCESS_KEY}' aws ecs update-service --cluster thirdact-web-svc --service attic --force-new-deployment --region us-east-1"
      }
    }

     sh 'docker rmi -f $(docker images | grep "attic") || true'
}
