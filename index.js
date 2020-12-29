console.log("Loading function");

const aws = require("aws-sdk");
const s3 = new aws.S3();
// const bucketName = バケット名;
const fs = require("fs");
const execSync = require("child_process").execSync;
process.env.PATH += ":/var/task/bin";

exports.handler = async (event, context) => {
  console.log("Received event:", JSON.stringify(event));

  const bucket = event.Records[0].s3.bucket.name;
  const key = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );
  const extension = key.split("/")[key.split("/").length - 1].split(".")[1];
  const filename = key.split("/")[key.split("/").length - 1].split(".")[0];
  const params = {
    Bucket: bucket,
    Key: key,
  };

  const uploaded_data = await s3
    .getObject(params)
    .promise()
    .catch((err) => {
      console.log(err);
      const message = `Error getting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
      console.log(message);
      throw new Error(message);
    });

  fs.writeFileSync("/tmp/" + filename + "." + extension, uploaded_data.Body);

  console.log(extension);
  if (extension === "wav") {
    // wavなら一旦mp3へ変換(抽出)
    execSync(
      "ffmpeg -i /tmp/" +
        filename +
        "." +
        extension +
        " -vn -ac 2 -ar 44100 -ab 256k -acodec libmp3lame -f mp3 /tmp/" +
        filename +
        ".mp3"
    );
  }

  // 再生時間秒数取得
  // execSync('ffprobe -v error -i /tmp/' + filename + '.' + extension + ' /tmp/' + filename + ".mp3 --select_streams v:0 -show_entries stream=duration | sed '/^[/d' | sed s/duration=// | sed s/.[0-9,]*$//g-y");
  // execSync('ffprobe /tmp/' + filename + '.' + extension + ' /tmp/' + filename + ".mp3 --select_streams v:0 -show_entries stream=duration | sed '/^[/d' | sed s/duration=// | sed s/.[0-9,]*$//g-y");

  // 8分割 現状 5秒とかにしとく?
  execSync(
    "ffmpeg -i /tmp/" + filename + ".mp3" + " -t 5 /tmp/" + filename + "_1.mp3"
  );
  execSync(
    "ffmpeg -i /tmp/" +
      filename +
      ".mp3" +
      " -ss 5 -t 5 /tmp/" +
      filename +
      "_2.mp3"
  );
  execSync(
    "ffmpeg -i /tmp/" +
      filename +
      ".mp3" +
      " -ss 10 -t 5 /tmp/" +
      filename +
      "_3.mp3"
  );
  execSync(
    "ffmpeg -i /tmp/" +
      filename +
      ".mp3" +
      " -ss 15 -t 5 /tmp/" +
      filename +
      "_4.mp3"
  );
  execSync(
    "ffmpeg -i /tmp/" +
      filename +
      ".mp3" +
      " -ss 20 -t 5 /tmp/" +
      filename +
      "_5.mp3"
  );
  execSync(
    "ffmpeg -i /tmp/" +
      filename +
      ".mp3" +
      " -ss 25 -t 5 /tmp/" +
      filename +
      "_6.mp3"
  );
  execSync(
    "ffmpeg -i /tmp/" +
      filename +
      ".mp3" +
      " -ss 30 -t 5 /tmp/" +
      filename +
      "_7.mp3"
  );
  execSync(
    "ffmpeg -i /tmp/" +
      filename +
      ".mp3" +
      " -ss 35 -t 5 /tmp/" +
      filename +
      "_8.mp3"
  );

  //   const child = execSync( "cd /tmp && ls -a" , function(error, stdout, stderr) {
  //       if(stdout){
  //           console.log('stdout:'+stdout);
  //       }
  //       if(stderr){
  //           console.log('stderr:'+stderr);
  //       }
  //       if (error !== null) {
  //           console.log('error: ' + error);
  //       } else {
  //           console.log("？");
  //       }
  //   });

  // 出力先バケット (再帰防止)
  const dstBucket = bucket + "-splited";
  const dstKey = key;

  for (let i = 1; i <= 8; i++) {
    const fileStream = fs.createReadStream(
      "/tmp/" + filename + `_${i + 1}.mp3`
    );
    fileStream.on("error", function (error) {
      console.log(error);
      throw new Error(error);
    });

    await s3
      .putObject({
        Bucket: dstBucket,
        Key: `${dstKey}/${dstKey}_${i}.mp3`,
        Body: fileStream,
        ContentType: "audio/mpeg",
      })
      .promise()
      .catch((err) => {
        console.log(err);
        const message = `Error putting object ${key} from bucket ${bucket}. Make sure they exist and your bucket is in the same region as this function.`;
        console.log(message);
        throw new Error(message);
      });
  }

  return `Success getting and putting object ${key} from bucket ${bucket}.`;
};
