import serial
import numpy as np
import cv2
import time


face_cascade = cv2.CascadeClassifier('./cascades/haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier('./cascades/haarcascade_eye.xml')

# fourcc = cv2.VideoWriter_fourcc(*'XVID')
# out = cv2.VideoWriter('./videos/faceDetection.avi', fourcc, 20.0, (640, 480))

frameRep = 2
currFrame = 0
lastActionTs = 0.0

arduinoData =  serial.Serial('/dev/cu.usbmodem144101', 9600)
class MoveMotor():
    def clockWise(self):
        if canPerformAction():
            arduinoData.write(b'a')

    def antiClockWise(self):
        if canPerformAction():
            arduinoData.write(b'c')

def canPerformAction():
    global lastActionTs
    localTS = ts()
    if lastActionTs + 1000.0 < localTS:
        lastActionTs = ts()
        return True
    return False


def ts():
    return time.time()*1000.0
