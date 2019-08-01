import cv2
import os
import numpy as np
from PIL import Image
from enum import Enum
from random import *

faceCascade = cv2.CascadeClassifier('../cascades/haarcascade_frontalface_default.xml')

class People(Enum):
    ankit = 1
    pradeep = 2
    krithika = 3

recognizer = cv2.face.LBPHFaceRecognizer_create()

def get_images_and_labels(path):
    image_paths = [os.path.join(path, f) for f in os.listdir(path)]

    images = []
    labels = []

    for image_path in image_paths:
        image_pil = cv2.imread(image_path, 0)
        image = np.array(image_pil, 'uint8')

        nbr = os.path.split(image_path)[1].split('.')[0]
        faces = faceCascade.detectMultiScale(image)

        for(x, y, w, h) in faces:
            images.append(image[y:y + h, x: x + w])
            labels.append(People[nbr].value)
             #cv2.imshow(nbr, image[y:y + h, x: x + w])
             #cv2.waitKey(1000)

    return images, labels


path = '../faces'
images, labels = get_images_and_labels(path)


recognizer.train(images, np.array(labels))
recognizer.save('../recognizer/faceRecognizer.xml')

#exam_images_arr = ['./images/ankit.jpg', './images/pradeep1.jpg', './images/krithika5.jpeg']


def test_image(images_path):
    exam_image = cv2.imread(images_path, 0)
    predict_image = np.array(exam_image, 'uint8')

    faces = faceCascade.detectMultiScale(predict_image)
    nbr_actual = os.path.split(images_path)[1]

    for (x, y, w, h) in faces:
        nbr_predicted, conf = recognizer.predict(predict_image[y: y+h, x: x+w])
        cv2.imshow('exam', predict_image[y: y+h, x: x+w])

        print( "{} is recognized as {} : {} with confidence level: {}".format(nbr_actual, nbr_predicted, People(nbr_predicted).name, conf) )

        cv2.waitKey(1000)


#for images_path in exam_images_arr:
#    test_image(images_path)



cv2.destroyAllWindows()







#env=prod* host=lutron* | stats count by level | eventstats sum(count) as totalCalls | eval percentage=((count/totalCalls)*100)


#  "ecobeec01.sjc.comcast.com".indexOf('01')