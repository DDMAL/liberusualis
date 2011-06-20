from string import lower

import glob

from lxml import etree

from PIL import Image

from optparse import OptionParser

from pymei.Helpers import generate_mei_id
from pymei.Components import Modules as mod, MeiDocument
from pymei.Export import meitoxml
from pymei.Import import xmltomei

from spellcheck import correct

"""
Generates mei files and outputs to ../mei_spellchecked_output. Make sure that ????.html and its corresponding ????.png and ????_uncoor.mei (if it exists) are in the pwd.

If no flag is given, this script uses Peter Norvig's spelling checker to attempt to improve the quality of the hocr text output. Make sure that spellcheck.py and latin-english.txt are also in this dir. It also removes dashes from lyrics and fixes common spelling errors that are not corrected by the spell-checker.

If the flag -u (--uncorrected) is given, this script uses text from the hocr output without any correction.
"""

parser=OptionParser()
parser.add_option("-u", "--uncorrected", action="store_false", dest="corrected", default=True)
(options, args)=parser.parse_args()

def getlines(hocrfile):
	"""
	arg: hocrfile as string (ex. '0001')
	return: lines as list of dictionaries [{'bbox' : (ulx, uly, lrx, lry), 'text' : 'TEXT'}, ...]
	"""
	parser=etree.HTMLParser()
	tree=etree.parse(hocrfile+'.html', parser)
	im=Image.open(hocrfile+'.png')
	l=[]
	for element in tree.getroot().iter("span"):
		bbox=[int(x) for x in element.attrib['title'].split()[1:]]
		corrected=[bbox[0], im.size[1]-bbox[3], bbox[2], im.size[1]-bbox[1]]
		d={}
		d['bbox']=tuple(corrected)
		d['text']=element.text
		l.append(d)
	return l

def correct_text(line):
	"""
	fixes text in lines - removes dashes from lyrics, corrects spelling
	"""
	# check if text output should be corrected or not
	if options.corrected:
		# remove dashes from text
		line['text']=replace(line['text'], '- ', '')
		line['text']=replace(line['text'], '-', '')
		# correct spelling if corrected output is not 's' (short words sometimes get corrected to 's' - weird)
		words=[correct(lower(word)) for word in line['text'].split() if correct(lower(word))!='s']
		return ' '.join(words)
	else:
		return line['text']

def add_text_lines(hocrfile, surface, section):
	"""
	helper method that adds lines in hocr file to 'surface' and 'section' in mei file
	"""
	div=mod.div_()
	div.id=generate_mei_id()
	lg=mod.lg_()
	lg.id=generate_mei_id()
	section.add_child(div)
	div.add_child(lg)
	for line in getlines(hocrfile):
		# for each line: make new zone and l objects, add zone to surface
		zone=mod.zone_()
		zone.id=generate_mei_id()
		zone.ulx=line['bbox'][0]
		zone.uly=line['bbox'][1]
		zone.lrx=line['bbox'][2]
		zone.lry=line['bbox'][3]
		l=mod.l_()
		l.id=generate_mei_id()
		l.facs=zone.id
		l.value=correct_text(line)
		lg.add_child(l)
		surface.add_child(zone)


# import hocr and mei files into lists and strip extension
hocrfiles=[x.split('.')[0] for x in glob.glob('????.html')]
meifiles=[x.split('_')[0] for x in glob.glob('*.mei')]
# for each hocr file: if corresponding mei file exists, open mei and edit - if not, create new mei fragment
for hocrfile in hocrfiles:
	if hocrfile in meifiles:
		meifile=xmltomei.xmltomei('%s_uncorr.mei' % (hocrfile,))
		surface=meifile.search('surface')[0]
		section=meifile.search('section')[0]
		add_text_lines(hocrfile, surface, section)
		meitoxml.meitoxml(meifile, '../mei_spellchecked_output/%s_uncorr.mei' % (hocrfile,))
	else:
		meifile=MeiDocument.MeiDocument()
		mei=mod.mei_()
		surface=mod.surface_()
		section=mod.section_()
		mei.add_children([surface, section])
		add_text_lines(hocrfile, surface, section)
		meifile.addelement(mei)
		meitoxml.meitoxml(meifile, '../mei_spellchecked_output/%s_fragment.mei' % (hocrfile,))
