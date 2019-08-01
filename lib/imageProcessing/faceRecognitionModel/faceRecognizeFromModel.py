import cv2
import os
import sys
import numpy as np
from PIL import Image
from enum import Enum
from random import *

class People(Enum):
    ankit = 1
    pradeep = 2
    krithika = 3

faceCascade = cv2.CascadeClassifier(os.path.abspath(os.path.join(__file__, '../../cascades/haarcascade_frontalface_default.xml')))
recognizer = cv2.face.LBPHFaceRecognizer_create()
recognizer.read(os.path.abspath(os.path.join(__file__, '../../recognizer/faceRecognizer.xml')))


def recognizeFace():
    cap = cv2.VideoCapture(0)
    output = []

    imgArr = []

    while(1):
        ret, imageColor = cap.read()
        image = cv2.cvtColor(imageColor, cv2.COLOR_BGR2GRAY)
        faces = faceCascade.detectMultiScale(image, 1.2, 5)
        imageDetected = False

        for(x, y, w, h) in faces:
            nbr_predicted, conf = recognizer.predict(image[y: y+h, x: x+w])
            #cv2.imshow('cameraImage', image[y: y+h, x: x+w])
            #cv2.imwrite('./face2/a'+str(randint(1, 100))+'.jpg', image)
            imgName = str(randint(1, 1000))+'.jpg'
            imgArr.append(imgName)

            imgObj = {}
            imgObj["name"] = imgName
            imgObj["conf"] = conf
            imgObj["who"] = People(nbr_predicted).name

            # if(conf < 20):
            #     #print("Can't Recognize")
            # else:
            #     #print("{}:{} || Confidence: {}".format(nbr_predicted, People(nbr_predicted).name, conf))
            #     output = People(nbr_predicted).name#'{"name":' + People(nbr_predicted).name + ', "confidence":' + conf

            output.append(imgObj)

            imageDetected = True
            cap.release()
            cv2.imwrite(os.path.abspath(os.path.join(__file__, '../../../detectedImages/'+imgName)), imageColor[y: y+h, x: x+w])
            #cv2.waitKey(0)
        
        if(imageDetected): break

    cap.release()
    cv2.destroyAllWindows()

    print(output)

recognizeFace()
