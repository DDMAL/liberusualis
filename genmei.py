from string import lower, replace
from PIL import Image
from optparse import OptionParser
import glob
import os

from lxml import etree
from pymei.Helpers import generate_mei_id
from pymei.Components import Modules as mod, MeiDocument
from pymei.Export import meitoxml
from pymei.Import import xmltomei

from spellcheck import correct

"""
Generates mei files and outputs to ../mei_corrtxt or ../mei_uncorrtxt if the -u flag is given. Make sure that ????.html and its corresponding ????.png and ????_uncoor.mei (if it exists) are in the pwd.

If no flag is given, this script uses Peter Norvig's spelling checker to attempt to improve the quality of the hocr text output. Make sure that spellcheck.py and latin-english.txt are also in this dir. It also removes dashes from lyrics and fixes common spelling errors that are not corrected by the spell-checker.

If the flag -u (--uncorrected) is given, this script uses text from the hocr output without any correction.
"""

parser=OptionParser()
parser.add_option("-u", "--uncorrected", action="store_false", dest="corrected", default=True)
(options, args)=parser.parse_args()

# make output directory
if options.corrected:
	os.system('mkdir ../mei_corrtxt')
else:
	os.system('mkdir ../mei_uncorrtxt')

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
	
def force_correct(word):
	"""
	arg: commonly misspelt word that the spell-checker cannot catch
	return: correct spelling of word
	"""
	if word=='unc':
		return 'nunc'
	elif word=='gnus':
		return 'agnus'
	elif word=='yrie':
		return 'kyrie'
	elif word=='redo':
		return 'credo'
	elif word=='ominus':
		return 'dominus'
	elif word=='remus':
		return 'oremus'
	elif word=='ectio':
		return 'lectio'
	elif word=='er':
		return 'per'
	elif word=='eus':
		return 'deus'
	elif word=='hriste':
		return 'christe'
	elif word=='ector':
		return 'rector'
	elif word=='niquo':
		return 'iniquo'
	elif word=='ucis':
		return 'lucis'
	elif word=='iliae':
		return 'filiae'
	elif word=='isirere':
		return 'misirere'
	elif word=='alva':
		return 'salva'
	elif word=='ripe':
		return 'eripe'
	else:
		return word

def correct_text(line):
	"""
	fixes text in lines - removes dashes from lyrics, corrects spelling
	"""
	# check if text output should be corrected or not
	if options.corrected:
		# fix strange problem where 'lu-' is read as 'hb'
		line['text']=replace(line['text'], 'hb', 'lu-')
		# remove dashes from text
		line['text']=replace(line['text'], '- ', '')
		line['text']=replace(line['text'], '-', '')
		# correct common spelling errors that the spell-checker cannot catch
		words=line['text'].split()
		words[0]=force_correct(words[0])
		# correct spelling if corrected output is not 's' (short words sometimes get corrected to 's' - weird)
		words=[correct(lower(word)) for word in words if correct(lower(word))!='s']
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


# import hocr and mei files into lists and strip extension where useful
hocrfiles=[x.split('.')[0] for x in glob.glob('????.html')]
allmeifiles=glob.glob('*.mei')
meifiles=[x.split('_')[0] for x in allmeifiles]
# for each hocr file: if corresponding mei file exists, open mei and edit - if not, create new mei
for hocrfile in hocrfiles:
	if hocrfile in meifiles:
		output_name='%s_corr.mei' % (hocrfile,) if '%s_corr.mei' % (hocrfile,) in allmeifiles else '%s_uncorr.mei' % (hocrfile,)
		meifile=xmltomei.xmltomei(output_name)
		surface=meifile.search('surface')[0]
		section=meifile.search('section')[0]
		add_text_lines(hocrfile, surface, section)
		if options.corrected:
			meitoxml.meitoxml(meifile, '../mei_corrtxt/%s' % (output_name,))
		else:
			meitoxml.meitoxml(meifile, '../mei_uncorrtxt/%s' % (output_name,))
	else:
		# build new mei file
		meifile=MeiDocument.MeiDocument()
		mei=mod.mei_()
		
		# header
		meihead=mod.meihead_()
		filedesc=mod.filedesc_()
		titlestmt=mod.titlestmt_()
		title=mod.title_()
		pubstmt=mod.pubstmt_()
		
		meihead.add_child(filedesc)
		filedesc.add_children([titlestmt, pubstmt])
		titlestmt.add_child(title)
		
		# music - facsimile, layout, body
		music=mod.music_()
		
		facsimile=mod.facsimile_()
		facsimile.id=generate_mei_id()
		surface=mod.surface_()
		surface.id=generate_mei_id()
		graphic=mod.graphic_()
		graphic.id=generate_mei_id()
		graphic.attributes={'xlink:href':'%s_original_image.tiff' % (hocrfile,)}
		
		facsimile.add_child(surface)
		surface.add_child(graphic)
		
		layout=mod.layout_()
		layout.id=generate_mei_id()
		page=mod.page_()
		page.id=generate_mei_id()
		page.attributes={'n':hocrfile}
		
		layout.add_child(page)
		
		body=mod.body_()
		mdiv=mod.mdiv_()
		mdiv.attributes={'type':'solesmes'}
		score=mod.score_()
		section=mod.section_()
		pb=mod.pb_()
		pb.id=generate_mei_id()
		pb.attributes={'pageref':page.id}
		body.add_child(mdiv)
		mdiv.add_child(score)
		score.add_child(section)
		section.add_child(pb)
		
		music.add_children([facsimile, layout, body])
		
		mei.add_children([meihead, music])
		
		# add text to new mei file
		add_text_lines(hocrfile, surface, section)
		meifile.addelement(mei)
		if options.corrected:
			meitoxml.meitoxml(meifile, '../mei_corrtxt/%s_txtonly.mei' % (hocrfile,))
		else:
			meitoxml.meitoxml(meifile, '../mei_uncorrtxt/%s_txtonly.mei' % (hocrfile,))
