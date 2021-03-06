#!/usr/bin/env python

import os
import glob

"""
Put this in the dir with original .tiff images. Generates hocrs from all the .tiffs in the pwd and copies them to a new dir hocr_output.
"""

# Binarize images
os.system('ocropus-binarize *.tiff')

# Correct image names - finds correct image names in file FILES generated by ocropus-binarize
f=open('book/FILES')
lines=f.readlines()
lines.sort()
lines.reverse()
for line in lines:
	s1=line.split('\t', 1)
	s2=s1[1].split('/', 1)
	os.system('mv book/%s.png book/%s.png' % (s1[0], s2[0]))
	os.system('mv book/%s.bin.png book/%s.bin.png' % (s1[0], s2[0]))

# Segment pages
os.system('ocropus-pseg book/????.png')

# Generate recognition lattices
os.system('ocropus-lattices -O -m my.cmodel book/????/??????.png')

# Output text without language model
os.system('ocropus fsts2bestpaths book')

# Generate hocr
filenames = [x.split('.')[0] for x in glob.glob('book/????.png')]
for filename in filenames:
    os.system('ocropus-hocr %s.png > %s.html' % (filename, filename))

# Copy hocr files to dir hocr_output
os.system('mkdir hocr_output')
os.system('cp book/*.html hocr_output')
